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
import hash from '../../../common/util/hash'
import searchFile from './search-file'
import { shell } from 'electron'
import safeAssign from '../../../common/util/safe-assign'
// Import the interfaces that we need
import { DirDescriptor, CodeFileDescriptor, CodeFileMeta } from './types'
import FSALCache from './fsal-cache'

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {CodeFileDescriptor} origFile The file object
 * @param {any} cachedFile The cache object to apply
 */
function applyCache (cachedFile: any, origFile: CodeFileDescriptor): CodeFileDescriptor {
  return safeAssign(cachedFile, origFile) as CodeFileDescriptor
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {CodeFileDescriptor} origFile The file to cache
 */
function cacheFile (origFile: CodeFileDescriptor, cacheAdapter: FSALCache): void {
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
async function updateFileMetadata (fileObject: CodeFileDescriptor): Promise<void> {
  try {
    let stat = await fs.lstat(fileObject.path)
    fileObject.modtime = stat.mtime.getTime()
    global.log.info(`Updated modtime for fileDescriptor ${fileObject.name} to ${fileObject.modtime}`)
  } catch (e) {
    global.log.error(`Could not update the metadata for file ${fileObject.name}: ${String(e.message).toString()}`, e)
  }
}

function parseFileContents (file: CodeFileDescriptor, content: string): void {
  // Determine linefeed to preserve on saving so that version control
  // systems don't complain.
  file.linefeed = '\n'
  if (content.includes('\r\n')) file.linefeed = '\r\n'
  if (content.includes('\n\r')) file.linefeed = '\n\r'
}

export function metadata (fileObject: CodeFileDescriptor): CodeFileMeta {
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
    type: fileObject.type,
    modtime: fileObject.modtime,
    creationtime: fileObject.creationtime,
    linefeed: fileObject.linefeed,
    modified: fileObject.modified,
    content: ''
  }
}

export async function parse (
  filePath: string,
  cache: FSALCache,
  parent: DirDescriptor|null = null
): Promise<CodeFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: CodeFileDescriptor = {
    parent: null, // We have to set this AFTERWARDS, as safeAssign() will traverse down this parent property, thereby introducing a circular structure
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    hash: hash(filePath),
    ext: path.extname(filePath),
    id: '', // The ID, if there is one inside the file.
    tags: [], // All tags that are to be found inside the file's contents.
    type: 'code',
    modtime: 0, // Modification time
    creationtime: 0, // Creation time
    linefeed: '\n',
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

  return file
}

export async function search (fileObject: CodeFileDescriptor, terms: string[]): Promise<any> {
  // Initialise the content variables (needed to check for NOT operators)
  let cnt = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return searchFile(fileObject, terms, cnt)
}

export async function load (fileObject: CodeFileDescriptor): Promise<string> {
  // Loads the content of a file from disk
  return await fs.readFile(fileObject.path, { encoding: 'utf8' })
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
  cacheFile(fileObject, cache)
}

export async function rename (fileObject: CodeFileDescriptor, cache: any, newName: string): Promise<void> {
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

export function remove (fileObject: CodeFileDescriptor): void {
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
        global.log.error(`[FSAL CodeFile] Could not remove file ${fileObject.path}: ${err.message as string}`, err)
      })
  }
}

export function markDirty (fileObject: CodeFileDescriptor): void {
  fileObject.modified = true
}

export function markClean (fileObject: CodeFileDescriptor): void {
  fileObject.modified = false
}
