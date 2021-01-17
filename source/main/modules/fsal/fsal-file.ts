/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseFile function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Parses a file, retrieving it from cache, if possible.
 *
 * END HEADER
 */

import { promises as fs } from 'fs'
import path from 'path'
import hash from '../../../common/util/hash'
import searchFile from './util/search-file'
import countWords from '../../../common/util/count-words'
import extractYamlFrontmatter from '../../../common/util/extract-yaml-frontmatter'
import { getIDRE } from '../../../common/regular-expressions'
import { shell } from 'electron'
import safeAssign from '../../../common/util/safe-assign'
// Import the interfaces that we need
import { DirDescriptor, MDFileDescriptor, MDFileMeta } from './types'
import FSALCache from './fsal-cache'
import extractBOM from './util/extract-bom'

// Here are all supported variables for Pandoc:
// https://pandoc.org/MANUAL.html#variables
// Below is a selection that Zettlr may use
const FRONTMATTER_VARS = [
  'title',
  'subtitle',
  'author',
  'date',
  'keywords',
  'tags',
  'lang'
]

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {MDFileDescriptor} origFile The file object
 * @param {any} cachedFile The cache object to apply
 */
function applyCache (cachedFile: any, origFile: MDFileDescriptor): MDFileDescriptor {
  return safeAssign(cachedFile, origFile) as MDFileDescriptor
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {Object} origFile The file to cache
 */
function cacheFile (origFile: MDFileDescriptor, cacheAdapter: FSALCache): void {
  // We'll use a metadata version of the original file sans the parent property
  let copy = metadata(origFile)
  delete (copy as any).parent // Make sure not to store circular properties
  if (!cacheAdapter.set(origFile.hash.toString(), copy)) {
    global.log.error(`Could not cache file ${origFile.name}!`)
  }
}

/**
 * Updates the file metadata (such as modification time) from lstat.
 *
 * @param   {Object}  fileObject  The object to be updated
 * @return  {void}              Does not return
 */
async function updateFileMetadata (fileObject: MDFileDescriptor): Promise<void> {
  try {
    let stat = await fs.lstat(fileObject.path)
    fileObject.modtime = stat.mtime.getTime()
    global.log.info(`Updated modtime for fileDescriptor ${fileObject.name} to ${fileObject.modtime}`)
  } catch (e) {
    global.log.error(`Could not update the metadata for file ${fileObject.name}: ${String(e.message).toString()}`, e)
  }
}

/**
 * Parses the given file contents and updates the file descriptor with these.
 *
 * @param   {MDFileDescriptor}  file     The file descriptor to be updated
 * @param   {string}            content  The file contents
 */
function parseFileContents (file: MDFileDescriptor, content: string): void {
  // Parse the file
  let idRE = getIDRE()
  let linkStart = global.config.get('zkn.linkStart')
  let linkEnd = global.config.get('zkn.linkEnd')

  file.bom = extractBOM(content)
  // To detect tags in accordance with what the engine will render as tags,
  // we need to exclude everything that is not preceded by either a newline
  // or a space.
  // Positive lookbehind: Assert either a space, a newline or the start of the
  // string.
  let tagRE = /(?<= |\n|^)#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*^+~÷\\/|<=>[\](){}]+#?)/g
  let match
  // Get the word and character count
  file.wordCount = countWords(content)
  file.charCount = countWords(content, true)

  file.firstHeading = null
  let h1Match = /^#{1}\s(.+)$/m.exec(content)
  if (h1Match !== null) file.firstHeading = h1Match[1]

  // Extract a potential YAML frontmatter
  file.frontmatter = null // Reset first
  let frontmatter = extractYamlFrontmatter(content)
  if (frontmatter !== null) {
    if (file.frontmatter === null) {
      file.frontmatter = {}
    }
    for (let [ key, value ] of Object.entries(frontmatter)) {
      if (FRONTMATTER_VARS.includes(key)) {
        file.frontmatter[key] = value
      }
    }
  }

  // Create a copy of the text contents without any code blocks and inline
  // code for the tag and ID extraction methods.
  let mdWithoutCode = content.replace(/^`{3,}.+`{3,}$|`[^`]+`|~{3,}[^~]+~{3,}/gms, '')

  // Determine linefeed to preserve on saving so that version control
  // systems don't complain.
  file.linefeed = '\n'
  if (content.includes('\r\n')) file.linefeed = '\r\n'
  if (content.includes('\n\r')) file.linefeed = '\n\r'

  // Makes footnotes unique by prefixing them with this file's hash (which is unique)
  // Pandoc will make sure the footnotes are numbered correctly.
  // TODO
  // if (options.hasOwnProperty('uniqueFootnotes') && options.uniqueFootnotes === true) {
  //   cnt = cnt.replace(/\[\^([\w]+?)\]/gm, (match, p1, offset, string) => `[^${String(this.hash)}${p1}]`)
  // }

  // Now read all tags
  file.tags = [] // Reset tags
  while ((match = tagRE.exec(mdWithoutCode)) != null) {
    let tag = match[1]
    tag = tag.replace(/#/g, '') // Prevent headings levels 2-6 from showing up in the tag list
    if (tag.length > 0) file.tags.push(match[1].toLowerCase())
  }

  // Merge possible keywords from the frontmatter
  if (file.frontmatter?.keywords != null) {
    // The user can just write "keywords: something", in which case it won't be
    // an array, but a simple string (or even a number <.<). I am beginning to
    // understand why programmers despise the YAML-format.
    if (!Array.isArray(file.frontmatter.keywords)) {
      const keys = file.frontmatter.keywords.split(',')
      if (keys.length > 1) {
        // The user decided to split the tags by comma
        file.frontmatter.keywords = keys.map((tag: string) => tag.trim())
      } else {
        file.frontmatter.keywords = [file.frontmatter.keywords]
      }
    }

    // If the user decides to use just numbers for the keywords (e.g. #1997),
    // the YAML parser will obviously cast those to numbers, but we don't want
    // this, so forcefully cast everything to string (see issue #1433).
    const sanitizedKeywords = file.frontmatter.keywords.map((tag: any) => String(tag).toString())
    file.tags = file.tags.concat(sanitizedKeywords)
  }

  // Now the same for the tags-property.
  if (file.frontmatter?.tags != null) {
    if (!Array.isArray(file.frontmatter.tags)) {
      const keys = file.frontmatter.tags.split(',')
      if (keys.length > 1) {
        // The user decided to split the tags by comma
        file.frontmatter.tags = keys.map((tag: string) => tag.trim())
      } else {
        file.frontmatter.tags = [file.frontmatter.tags]
      }
    }
    const sanitizedKeywords = file.frontmatter.tags.map((tag: any) => String(tag).toString())
    file.tags = file.tags.concat(sanitizedKeywords)
  }

  // Remove duplicates
  file.tags = [...new Set(file.tags)]

  // Assume an ID in the file name (takes precedence over IDs in the file's
  // content)
  if ((match = idRE.exec(file.name)) == null) {
    while ((match = idRE.exec(mdWithoutCode)) != null) {
      if (mdWithoutCode.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
        // Found the first ID. Precedence should go to the first found.
        // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
        break
      }
    }
  }

  if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
    file.id = match[1]
  } else {
    file.id = '' // Remove the file id again
  }
}

/**
 * Returns a metadata descriptor for the given file descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The source descriptor
 *
 * @return  {MDFileMeta}                    The metadata descriptor
 */
export function metadata (fileObject: MDFileDescriptor): MDFileMeta {
  return {
    // By only passing the hash, the object becomes
    // both lean AND it can be reconstructed into a
    // circular structure with NO overheads in the
    // renderer.
    parent: (fileObject.parent !== null) ? fileObject.parent.hash : null,
    dir: fileObject.dir,
    path: fileObject.path,
    name: fileObject.name,
    hash: fileObject.hash,
    ext: fileObject.ext,
    id: fileObject.id,
    tags: fileObject.tags,
    type: fileObject.type,
    wordCount: fileObject.wordCount,
    charCount: fileObject.charCount,
    target: fileObject.target,
    modtime: fileObject.modtime,
    creationtime: fileObject.creationtime,
    firstHeading: fileObject.firstHeading,
    frontmatter: fileObject.frontmatter,
    linefeed: fileObject.linefeed,
    modified: fileObject.modified,
    content: ''
  }
}

/**
 * Parses an absolute file path into a file descriptor, applying cache if appropriate
 *
 * @param   {string}                     filePath  The absolute file path
 * @param   {FSALCache}                  cache     The cache connector for retrieval without parsing
 * @param   {DirDescriptor}              parent    The parent descriptor (if non-root file)
 *
 * @return  {Promise<MDFileDescriptor>}            Resolves with a file descriptor
 */
export async function parse (filePath: string, cache: FSALCache, parent: DirDescriptor|null = null): Promise<MDFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: MDFileDescriptor = {
    parent: null, // We have to set this AFTERWARDS, as safeAssign() will traverse down this parent property, thereby introducing a circular structure
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    hash: hash(filePath),
    ext: path.extname(filePath),
    id: '', // The ID, if there is one inside the file.
    tags: [], // All tags that are to be found inside the file's contents.
    bom: '', // Default: No BOM
    type: 'file',
    wordCount: 0,
    charCount: 0,
    target: undefined, // Contains the target object
    modtime: 0, // Modification time
    creationtime: 0, // Creation time
    linefeed: '\n',
    firstHeading: null, // May contain the first heading level 1
    frontmatter: null, // May contain frontmatter variables
    modified: false // If true, it has been modified in the renderer
  }

  // In any case, we need the most recent times.
  try {
    // Get lstat
    let stat = await fs.lstat(filePath)
    file.modtime = stat.mtime.getTime() // stat.ctimeMs DEBUG: Switch to mtimeMs for the time being
    file.creationtime = stat.birthtime.getTime()
  } catch (e) {
    global.log.error('Error reading file ' + filePath, e)
    throw e // Rethrow
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  let hasCache = false
  if (cache.has(file.hash.toString())) {
    let cachedFile = cache.get(file.hash.toString())
    // If the modtime is still the same, we can apply the cache
    if (cachedFile.modtime === file.modtime) {
      file = applyCache(cachedFile, file)
      hasCache = true
    }
  }

  // Now it is safe to assign the parent
  file.parent = parent

  if (!hasCache) {
    // Read in the file, parse the contents and make sure to cache the file
    let content = await fs.readFile(filePath, { encoding: 'utf8' })
    parseFileContents(file, content)
    cacheFile(file, cache)
  }

  // Get the target, if applicable
  file.target = global.targets.get(file.hash)

  // Finally, report the tags
  global.tags.report(file.tags)

  return file
}

/**
 * Searches the file associated with the file descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The corresponding file descriptor
 * @param   {string[]}          terms       The (already compiled) search terms
 *
 * @return  {Promise<any>}                  Resolves with search results
 */
export async function search (fileObject: MDFileDescriptor, terms: any[]): Promise<any> {
  // Initialise the content variables (needed to check for NOT operators)
  let cnt = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return searchFile(fileObject, terms, cnt)
}

/**
 * Sets the given file descriptor's target
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 * @param   {WritingTarget}     target      The target descriptor
 */
export function setTarget (fileObject: MDFileDescriptor, target: WritingTarget|undefined): void {
  fileObject.target = target
}

/**
 * Loads the file contents for the given descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 *
 * @return  {Promise<string>}               Resolves with the file contents
 */
export async function load (fileObject: MDFileDescriptor): Promise<string> {
  // Loads the content of a file from disk
  const content = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  // Account for an optional BOM, if present
  return content.substr(fileObject.bom.length)
}

/**
 * Determines if the file described has changed on disk.
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor in question
 *
 * @return  {Promise<boolean>}              Resolves to true if the file differs from the file descriptor.
 */
export async function hasChangedOnDisk (fileObject: MDFileDescriptor): Promise<boolean> {
  let stat = await fs.lstat(fileObject.path)
  return stat.mtime.getTime() !== fileObject.modtime
}

/**
 * Saves the content into the given file descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 * @param   {string}            content     The content to be written to file
 * @param   {FSALCache}         cache       The cache descriptor
 *
 * @return  {Promise<void>}                 Resolves upon save.
 */
export async function save (fileObject: MDFileDescriptor, content: string, cache: FSALCache): Promise<void> {
  // Make sure to retain the BOM if applicable
  await fs.writeFile(fileObject.path, fileObject.bom + content)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  global.tags.remove(fileObject.tags)
  parseFileContents(fileObject, content)
  global.tags.report(fileObject.tags)
  fileObject.modified = false // Always reset the modification flag.
  cacheFile(fileObject, cache)
}

/**
 * Renames the file represented by the descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 * @param   {FSALCache}         cache       The cache connector for updates
 * @param   {string}            newName     The new filename
 *
 * @return  {Promise<void>}                 Resolves upon success
 */
export async function rename (fileObject: MDFileDescriptor, cache: FSALCache, newName: string): Promise<void> {
  let oldPath = fileObject.path
  let newPath = path.join(fileObject.dir, newName)
  await fs.rename(oldPath, newPath)
  // Now update the object
  fileObject.path = newPath
  fileObject.hash = hash(newPath)
  fileObject.name = newName
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  cacheFile(fileObject, cache)
}

/**
 * Removes the file described by fileObject
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 */
export function remove (fileObject: MDFileDescriptor): void {
  const deleteOnFail: boolean = global.config.get('system.deleteOnFail')
  const deleteSuccess = shell.moveItemToTrash(fileObject.path, deleteOnFail)

  if (deleteSuccess && fileObject.parent !== null) {
    // Splice it from the parent directory
    const idx = fileObject.parent.children.indexOf(fileObject)
    fileObject.parent.children.splice(idx, 1)
  }

  if (!deleteSuccess) {
    // Forcefully remove the file
    fs.unlink(fileObject.path)
      .catch(err => {
        global.log.error(`[FSAL File] Could not remove file ${fileObject.path}: ${err.message as string}`, err)
      })
  }
}

/**
 * Sets the dirty flag on the file descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 */
export function markDirty (fileObject: MDFileDescriptor): void {
  fileObject.modified = true
}

/**
 * Clears the dirty flag on the file descriptor
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 */
export function markClean (fileObject: MDFileDescriptor): void {
  fileObject.modified = false
}
