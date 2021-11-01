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
import { getIDRE, getCodeBlockRE, getZknTagRE } from '../../../common/regular-expressions'
import { shell } from 'electron'
import safeAssign from '../../../common/util/safe-assign'
// Import the interfaces that we need
import { DirDescriptor, MDFileDescriptor, MDFileMeta } from './types'
import FSALCache from './fsal-cache'
import extractBOM from './util/extract-bom'
import shouldMatchTag from '../../../common/util/should-match-tag'

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
  'lang',
  'bibliography'
]

// Enum of all YAML frontmatter properties that can contain tags
const KEYWORD_PROPERTIES = [
  'keywords',
  'tags'
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
    fileObject.size = stat.size
    global.log.info(`Updated modtime for fileDescriptor ${fileObject.name} to ${fileObject.modtime}`)
  } catch (err: any) {
    global.log.error(`Could not update the metadata for file ${fileObject.name}: ${String(err.message).toString()}`, err)
  }
}

/**
 * Parses the given file contents and updates the file descriptor with these.
 *
 * @param   {MDFileDescriptor}  file     The file descriptor to be updated
 * @param   {string}            content  The file contents
 */
function parseFileContents (file: MDFileDescriptor, content: string): void {
  // Prepare some necessary regular expressions and variables
  const idRE = getIDRE()
  const tagRE = getZknTagRE(true)
  const codeBlockRE = getCodeBlockRE(true)
  const inlineCodeRE = /`[^`]+`/g
  const h1HeadingRE = /^#{1}\s(.+)$/m

  const linkStart = global.config.get('zkn.linkStart')
  const linkEnd = global.config.get('zkn.linkEnd')

  let match

  // First of all, determine all the things that have nothing to do with any
  // Markdown contents.
  file.bom = extractBOM(content)
  file.linefeed = '\n'
  if (content.includes('\r\n')) file.linefeed = '\r\n'
  if (content.includes('\n\r')) file.linefeed = '\n\r'

  // Then prepare the file contents as we need it for most of the function:
  // Strip a potential YAML frontmatter, code, and any HTML comments.
  const extracted = extractYamlFrontmatter(content, file.linefeed)
  const frontmatter = extracted.frontmatter

  const contentWithoutYAML = extracted.content
  const contentWithoutCode = contentWithoutYAML.replace(codeBlockRE, '').replace(inlineCodeRE, '')
  const plainMarkdown = contentWithoutCode.replace(/<!--.+?-->/gs, '') // Note the dotall flag

  // Finally, reset all those properties which we will extract from the file's
  // content so that they remain in their default if we don't find those in the
  // file.
  file.id = ''
  file.firstHeading = null
  file.tags = []
  file.frontmatter = null

  // Search for the file's ID first in the file name, and then in the full contents.
  if ((match = idRE.exec(file.name)) == null) {
    while ((match = idRE.exec(content)) != null) {
      if (content.substr(match.index - linkStart.length, linkStart.length) !== linkStart) {
        // Found the first ID. Precedence should go to the first found.
        // Minor BUG: Takes IDs that are inside links but not literally make up for a link.
        break
      }
    }
  }

  if ((match != null) && (match[1].substr(-(linkEnd.length)) !== linkEnd)) {
    file.id = match[1]
  }

  // At this point, we don't need the full content anymore. The next parsing
  // steps rely on a Markdown string that is stripped of a potential YAML
  // frontmatter, any code -- inline and blocks -- as well as any comments.

  file.wordCount = countWords(plainMarkdown)
  file.charCount = countWords(plainMarkdown, true)

  const h1Match = h1HeadingRE.exec(contentWithoutYAML)
  if (h1Match !== null) {
    file.firstHeading = h1Match[1]
  }

  while ((match = tagRE.exec(plainMarkdown)) != null) {
    if (!shouldMatchTag(match[0])) {
      continue
    }

    const tag = match[1].replace(/#/g, '')

    if (tag.length > 0) {
      file.tags.push(match[1].toLowerCase())
    }
  }

  if (frontmatter !== null) {
    file.frontmatter = {}
    for (const [ key, value ] of Object.entries(frontmatter)) {
      // Only keep those values which Zettlr can understand
      if (FRONTMATTER_VARS.includes(key)) {
        file.frontmatter[key] = value
      }
    }

    // Merge possible keywords from the frontmatter, e.g. from the "keywords" or
    // the "tags" property.
    for (const prop of KEYWORD_PROPERTIES) {
      if (file.frontmatter[prop] != null) {
        // The user can just write "keywords: something", in which case it won't be
        // an array, but a simple string (or even a number <.<). I am beginning to
        // understand why programmers despise the YAML-format.
        if (!Array.isArray(file.frontmatter[prop])) {
          const keys = file.frontmatter[prop].split(',')
          if (keys.length > 1) {
            // The user decided to split the tags by comma
            file.frontmatter[prop] = keys.map((tag: string) => tag.trim())
          } else {
            file.frontmatter[prop] = [file.frontmatter[prop]]
          }
        }

        // If the user decides to use just numbers for the keywords (e.g. #1997),
        // the YAML parser will obviously cast those to numbers, but we don't want
        // this, so forcefully cast everything to string (see issue #1433).
        const sanitizedKeywords = file.frontmatter[prop].map((tag: any) => String(tag).toString())
        file.tags = file.tags.concat(sanitizedKeywords)
      }
    }
  } // END: We got a frontmatter

  // At the end, remove any duplicates in the tags array.
  file.tags = [...new Set(file.tags)]
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
    size: fileObject.size,
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
export async function parse (filePath: string, cache: FSALCache|null, parent: DirDescriptor|null = null): Promise<MDFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: MDFileDescriptor = {
    parent: null, // We have to set this AFTERWARDS, as safeAssign() will traverse down this parent property, thereby introducing a circular structure
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    hash: hash(filePath),
    ext: path.extname(filePath),
    size: 0,
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
    file.modtime = stat.mtime.getTime()
    file.creationtime = stat.birthtime.getTime()
    file.size = stat.size
  } catch (err: any) {
    global.log.error('Error reading file ' + filePath, err)
    // Re-throw a nicer and more meaningful message
    throw new Error(`Could not read file ${filePath}: ${String(err.message)}`)
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  let hasCache = false
  if (cache?.has(file.hash.toString()) === true) {
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
    if (cache !== null) {
      cacheFile(file, cache)
    }
  }

  // Get the target, if applicable
  file.target = global.targets.get(file.path)

  // Finally, report the tags
  global.tags.report(file.tags, file.path)

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
export async function save (fileObject: MDFileDescriptor, content: string, cache: FSALCache|null): Promise<void> {
  // Make sure to retain the BOM if applicable
  await fs.writeFile(fileObject.path, fileObject.bom + content)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  global.tags.remove(fileObject.tags, fileObject.path)
  parseFileContents(fileObject, content)
  global.tags.report(fileObject.tags, fileObject.path)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
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
export async function rename (fileObject: MDFileDescriptor, cache: FSALCache|null, newName: string): Promise<void> {
  let oldPath = fileObject.path
  let newPath = path.join(fileObject.dir, newName)
  await fs.rename(oldPath, newPath)
  // Now update the object
  fileObject.path = newPath
  fileObject.hash = hash(newPath)
  fileObject.name = newName
  // Afterwards, reparse the file (this is important if the user switches from
  // an ID in the filename to an ID in the file, or vice versa)
  await reparseChangedFile(fileObject, cache)
}

/**
 * Removes the file described by fileObject
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 */
export async function remove (fileObject: MDFileDescriptor): Promise<void> {
  try {
    await shell.trashItem(fileObject.path)
  } catch (err: any) {
    if (global.config.get('system.deleteOnFail') === true) {
      // If this function throws, there's really something off and we shouldn't recover.
      await fs.unlink(fileObject.path)
    } else {
      global.log.error(`[FSAL File] Could not remove file ${fileObject.path}: ${String(err.message)}`)
      return
    }
  }

  if (fileObject.parent !== null) {
    // Splice it from the parent directory
    const idx = fileObject.parent.children.indexOf(fileObject)
    fileObject.parent.children.splice(idx, 1)
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

export async function reparseChangedFile (fileObject: MDFileDescriptor, cache: FSALCache|null): Promise<void> {
  // Literally the same as the save() function only without prior writing of contents
  const contents = await load(fileObject)
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  global.tags.remove(fileObject.tags, fileObject.path)
  parseFileContents(fileObject, contents)
  global.tags.report(fileObject.tags, fileObject.path)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}
