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
import searchFile from './util/search-file'
import safeAssign from '@common/util/safe-assign'
// Import the interfaces that we need
import type { MDFileDescriptor } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'
import type { SearchTerm } from '@dts/common/search'
import { getFilesystemMetadata } from './util/get-fs-metadata'
import { getAppServiceContainer, isAppServiceContainerReady } from '../../app-service-container'

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {MDFileDescriptor} origFile The file object
 * @param {any} cachedFile The cache object to apply
 */
function applyCache (cachedFile: MDFileDescriptor, origFile: MDFileDescriptor): MDFileDescriptor {
  return safeAssign(cachedFile, origFile)
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {Object} origFile The file to cache
 */
function cacheFile (origFile: MDFileDescriptor, cacheAdapter: FSALCache): void {
  if (!cacheAdapter.set(origFile.path, structuredClone(origFile))) {
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
    const metadata = await getFilesystemMetadata(fileObject.path)
    fileObject.modtime = metadata.modtime
    fileObject.size = metadata.size
  } catch (err: any) {
    err.message = `Could not update the metadata for file ${fileObject.name}: ${err.message as string}`
    throw err
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
  isRoot: boolean
): Promise<MDFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: MDFileDescriptor = {
    root: isRoot,
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath),
    size: 0,
    id: '', // The ID, if there is one inside the file.
    tags: [], // All tags that are to be found inside the file's contents.
    links: [], // Any outlinks
    bom: '', // Default: No BOM
    type: 'file',
    wordCount: 0,
    charCount: 0,
    modtime: 0, // Modification time
    creationtime: 0, // Creation time
    linefeed: '\n',
    firstHeading: null, // May contain the first heading level 1
    yamlTitle: undefined,
    frontmatter: null, // May contain frontmatter variables
    modified: false // If true, it has been modified in the renderer
  }

  // In any case, we need the most recent times.
  try {
    // Get lstat
    const metadata = await getFilesystemMetadata(filePath)
    file.modtime = metadata.modtime
    file.creationtime = metadata.birthtime
    file.size = metadata.size
  } catch (err: any) {
    err.message = 'Error reading file ' + filePath
    throw err // Re-throw
  }

  if (file.size > 10_000_000) {
    if (isAppServiceContainerReady()) {
      const logger = getAppServiceContainer().log
      logger.warning(`Skipped parsing of file "${file.path}": Too large (>10 MB)`)
    }
    return file
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  let hasCache = false
  if (cache?.has(file.path) === true) {
    const cachedFile = cache.get(file.path)
    // If the modtime is still the same, we can apply the cache
    if (cachedFile !== undefined && cachedFile.modtime === file.modtime && cachedFile.type === 'file') {
      file = applyCache(cachedFile, file)
      hasCache = true
    }
  }

  if (!hasCache) {
    // Read in the file, parse the contents and make sure to cache the file
    let content = await fs.readFile(filePath, { encoding: 'utf8' })
    parser(file, content)
    if (cache !== null) {
      cacheFile(file, cache)
    }
  }

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
 * Loads the file contents for the given descriptor. NOTE: This always returns
 * a document with newline feeds, normalizing the file contents, regardless of
 * the actual linefeed the file uses.
 *
 * @param   {MDFileDescriptor}  fileObject  The file descriptor
 *
 * @return  {Promise<string>}               Resolves with the file contents
 */
export async function load (fileObject: MDFileDescriptor): Promise<string> {
  // Loads the content of a file from disk
  const content = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return content
    // Account for an optional BOM, if present
    .substring(fileObject.bom.length)
    // Always split with a regular expression to ensure that mixed linefeeds
    // don't break reading in a file. Then, on save, the linefeeds will be
    // standardized to whatever the linefeed extractor detected.
    .split(/\r\n|\n\r|\n|\r/g)
    .join('\n')
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
 * Saves the content into the given file descriptor. NOTE: The file contents
 * must be using exclusively newlines.
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
  cache: FSALCache|null
): Promise<void> {
  // Make sure to retain the BOM if applicable, and use the correct linefeed.
  const safeContent = fileObject.bom + content.split('\n').join(fileObject.linefeed)
  await fs.writeFile(fileObject.path, safeContent)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  parser(fileObject, safeContent)
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
  cache: FSALCache|null
): Promise<void> {
  let oldPath = fileObject.path
  let newPath = path.join(fileObject.dir, newName)
  await fs.rename(oldPath, newPath)
  // Now update the object
  fileObject.path = newPath
  fileObject.name = newName
  // Afterwards, reparse the file (this is important if the user switches from
  // an ID in the filename to an ID in the file, or vice versa)
  await reparseChangedFile(fileObject, parser, cache)
}

export async function reparseChangedFile (
  fileObject: MDFileDescriptor,
  parser: (file: MDFileDescriptor, content: string) => void,
  cache: FSALCache|null
): Promise<void> {
  // Literally the same as the save() function only without prior writing of contents
  const contents = await load(fileObject)
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  parser(fileObject, contents)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}
