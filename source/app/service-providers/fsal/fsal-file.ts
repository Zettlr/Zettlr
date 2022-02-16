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
import hash from '@common/util/hash'
import searchFile from './util/search-file'
import { shell } from 'electron'
import safeAssign from '@common/util/safe-assign'
// Import the interfaces that we need
import { DirDescriptor, MDFileDescriptor } from '@dts/main/fsal'
import { MDFileMeta } from '@dts/common/fsal'
import FSALCache from './fsal-cache'
import { SearchTerm } from '@dts/common/search'
import TargetProvider, { WritingTarget } from '@providers/targets'
import TagProvider from '@providers/tags'

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
    throw new Error(`Could not cache file ${origFile.name}!`)
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
    const stat = await fs.lstat(fileObject.path)
    fileObject.modtime = stat.mtime.getTime()
    fileObject.size = stat.size
  } catch (err: any) {
    err.message = `Could not update the metadata for file ${fileObject.name}: ${err.message as string}`
    throw err
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
    size: fileObject.size,
    id: fileObject.id,
    tags: fileObject.tags,
    links: fileObject.links,
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
export async function parse (
  filePath: string,
  cache: FSALCache|null,
  parser: (file: MDFileDescriptor, content: string) => void,
  targets: TargetProvider,
  tags: TagProvider,
  parent: DirDescriptor|null = null
): Promise<MDFileDescriptor> {
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
    links: [], // Any outlinks
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
    const stat = await fs.lstat(filePath)
    file.modtime = stat.mtime.getTime()
    file.creationtime = stat.birthtime.getTime()
    file.size = stat.size
  } catch (err: any) {
    err.message = 'Error reading file ' + filePath
    throw err // Re-throw
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
    parser(file, content)
    if (cache !== null) {
      cacheFile(file, cache)
    }
  }

  // Get the target, if applicable
  file.target = targets.get(file.path)

  // Finally, report the tags
  tags.report(file.tags, file.path)

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
export async function search (fileObject: MDFileDescriptor, terms: SearchTerm[]): Promise<any> {
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
  return content.substring(fileObject.bom.length)
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
export async function save (
  fileObject: MDFileDescriptor,
  content: string,
  parser: (file: MDFileDescriptor, content: string) => void,
  tags: TagProvider,
  cache: FSALCache|null
): Promise<void> {
  // Make sure to retain the BOM if applicable
  await fs.writeFile(fileObject.path, fileObject.bom + content)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  tags.remove(fileObject.tags, fileObject.path)
  parser(fileObject, content)
  tags.report(fileObject.tags, fileObject.path)
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
export async function rename (
  fileObject: MDFileDescriptor,
  newName: string,
  parser: (file: MDFileDescriptor, content: string) => void,
  tags: TagProvider,
  cache: FSALCache|null
): Promise<void> {
  let oldPath = fileObject.path
  let newPath = path.join(fileObject.dir, newName)
  await fs.rename(oldPath, newPath)
  // Now update the object
  fileObject.path = newPath
  fileObject.hash = hash(newPath)
  fileObject.name = newName
  // Afterwards, reparse the file (this is important if the user switches from
  // an ID in the filename to an ID in the file, or vice versa)
  await reparseChangedFile(fileObject, parser, tags, cache)
}

/**
 * Removes the file described by fileObject
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 */
export async function remove (fileObject: MDFileDescriptor, deleteOnFail: boolean): Promise<void> {
  try {
    await shell.trashItem(fileObject.path)
  } catch (err: any) {
    if (deleteOnFail) {
      // If this function throws, there's really something off and we shouldn't recover.
      await fs.unlink(fileObject.path)
    } else {
      err.message = `[FSAL File] Could not remove file ${fileObject.path}: ${String(err.message)}`
      throw err
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

export async function reparseChangedFile (
  fileObject: MDFileDescriptor,
  parser: (file: MDFileDescriptor, content: string) => void,
  tags: TagProvider,
  cache: FSALCache|null
): Promise<void> {
  // Literally the same as the save() function only without prior writing of contents
  const contents = await load(fileObject)
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  tags.remove(fileObject.tags, fileObject.path)
  parser(fileObject, contents)
  tags.report(fileObject.tags, fileObject.path)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}
