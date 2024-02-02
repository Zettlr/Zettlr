/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseFile function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Parses a code file, retrieving it from cache, if possible.
 *
 * END HEADER
 */

import { promises as fs } from 'fs'
import path from 'path'
import searchFile from './util/search-file'
import { shell } from 'electron'
import safeAssign from '@common/util/safe-assign'
// Import the interfaces that we need
import type { CodeFileDescriptor } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'
import extractBOM from './util/extract-bom'
import { getFilesystemMetadata } from './util/get-fs-metadata'

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {CodeFileDescriptor} origFile The file object
 * @param {any} cachedFile The cache object to apply
 */
function applyCache (cachedFile: any, origFile: CodeFileDescriptor): CodeFileDescriptor {
  return safeAssign(cachedFile, origFile)
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {CodeFileDescriptor} origFile The file to cache
 */
function cacheFile (origFile: CodeFileDescriptor, cacheAdapter: FSALCache): void {
  if (!cacheAdapter.set(origFile.path, JSON.stringify(origFile))) {
    throw new Error(`Could not cache file ${origFile.name}!`)
  }
}

/**
 * Updates the file metadata (such as modification time) from lstat.
 *
 * @param   {Object}  fileObject  The object to be updated
 * @return  {void}              Does not return
 */
async function updateFileMetadata (fileObject: CodeFileDescriptor): Promise<void> {
  try {
    const metadata = await getFilesystemMetadata(fileObject.path)
    fileObject.modtime = metadata.modtime
    fileObject.size = metadata.size
  } catch (err: any) {
    err.message = `Could not update the metadata for file ${fileObject.name}: ${String(err.message)}`
    throw err
  }
}

function parseFileContents (file: CodeFileDescriptor, content: string): void {
  // Determine linefeed to preserve on saving so that version control
  // systems don't complain.
  file.linefeed = '\n'
  file.bom = extractBOM(content)
  if (content.includes('\r\n')) file.linefeed = '\r\n'
  if (content.includes('\n\r')) file.linefeed = '\n\r'
}

export async function parse (
  filePath: string,
  cache: FSALCache|null,
  isRoot: boolean
): Promise<CodeFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: CodeFileDescriptor = {
    root: isRoot,
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath),
    size: 0,
    bom: '', // Default: No BOM
    type: 'code',
    modtime: 0, // Modification time
    creationtime: 0, // Creation time
    linefeed: '\n',
    modified: false // If true, it has been modified in the renderer
  }

  // In any case, we need the most recent times.
  try {
    const metadata = await getFilesystemMetadata(filePath)
    file.modtime = metadata.modtime
    file.size = metadata.size
    file.creationtime = metadata.birthtime
  } catch (err: any) {
    err.message = 'Error reading file ' + filePath
    throw err // Re-throw
  }

  // Before reading in the full file and parsing it,
  // let's check if the file has been changed
  let hasCache = false
  if (cache?.has(file.path) === true) {
    let cachedFile = cache.get(file.path)
    // If the modtime is still the same, we can apply the cache
    if (cachedFile.modtime === file.modtime) {
      file = applyCache(cachedFile, file)
      hasCache = true
    }
  }

  if (!hasCache) {
    // Read in the file, parse the contents and make sure to cache the file
    let content = await fs.readFile(filePath, { encoding: 'utf8' })
    parseFileContents(file, content)
    if (cache !== null) {
      cacheFile(file, cache)
    }
  }

  return file
}

export async function search (fileObject: CodeFileDescriptor, terms: any[]): Promise<any> {
  // Initialise the content variables (needed to check for NOT operators)
  let cnt = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return searchFile(fileObject, terms, cnt)
}

export async function load (fileObject: CodeFileDescriptor): Promise<string> {
  // Loads the content of a file from disk
  const content = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return content.substring(fileObject.bom.length)
}

export async function hasChangedOnDisk (fileObject: CodeFileDescriptor): Promise<boolean> {
  let stat = await fs.lstat(fileObject.path)
  return stat.mtime.getTime() !== fileObject.modtime
}

export async function save (fileObject: CodeFileDescriptor, content: string, cache: any): Promise<void> {
  await fs.writeFile(fileObject.path, content)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  parseFileContents(fileObject, content)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}

export async function rename (fileObject: CodeFileDescriptor, cache: any, newName: string): Promise<void> {
  let oldPath = fileObject.path
  let newPath = path.join(fileObject.dir, newName)
  await fs.rename(oldPath, newPath)
  // Now update the object
  fileObject.path = newPath
  fileObject.name = newName
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}

export async function remove (fileObject: CodeFileDescriptor, deleteOnFail: boolean): Promise<void> {
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
}

export function markDirty (fileObject: CodeFileDescriptor): void {
  fileObject.modified = true
}

export function markClean (fileObject: CodeFileDescriptor): void {
  fileObject.modified = false
}

export async function reparseChangedFile (fileObject: CodeFileDescriptor, cache: any): Promise<void> {
  // Almost the same, except we don't write anything
  const contents = await load(fileObject)
  // Afterwards, retrieve the now current modtime
  await updateFileMetadata(fileObject)
  // Make sure to keep the file object itself as well as the tags updated
  parseFileContents(fileObject, contents)
  fileObject.modified = false // Always reset the modification flag.
  if (cache !== null) {
    cacheFile(fileObject, cache)
  }
}
