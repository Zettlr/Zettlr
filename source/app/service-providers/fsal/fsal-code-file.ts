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
import safeAssign from '@common/util/safe-assign'
// Import the interfaces that we need
import type { CodeFileDescriptor } from '@dts/common/fsal'
import type FSALCache from './fsal-cache'
import extractBOM from './util/extract-bom'
import { getFilesystemMetadata } from './util/get-fs-metadata'
import { extractLinefeed } from './util/extract-linefeed'
import type { SearchResult, SearchTerm } from 'source/types/common/search'

/**
 * Applies a cached file, saving time where the file is not being parsed.
 * @param {CodeFileDescriptor} origFile The file object
 * @param {any} cachedFile The cache object to apply
 */
function applyCache (cachedFile: CodeFileDescriptor, origFile: CodeFileDescriptor): CodeFileDescriptor {
  return safeAssign(cachedFile, origFile)
}

/**
 * Caches a file, but removes circular structures beforehand.
 * @param {CodeFileDescriptor} origFile The file to cache
 */
async function cacheFile (origFile: CodeFileDescriptor, cacheAdapter: FSALCache): Promise<void> {
  await cacheAdapter.set(origFile.path, structuredClone(origFile))
}

function parseFileContents (file: CodeFileDescriptor, content: string): void {
  // Determine linefeed to preserve on saving so that version control
  // systems don't complain.
  file.bom = extractBOM(content)
  file.linefeed = extractLinefeed(content)
}

export async function parse (
  filePath: string,
  cache: FSALCache|null
): Promise<CodeFileDescriptor> {
  // First of all, prepare the file descriptor
  let file: CodeFileDescriptor = {
    complete: true,
    dir: path.dirname(filePath), // Containing dir
    path: filePath,
    name: path.basename(filePath),
    ext: path.extname(filePath),
    size: 0,
    bom: '', // Default: No BOM
    type: 'code',
    modtime: 0, // Modification time
    creationtime: 0, // Creation time
    linefeed: '\n'
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
  if (await cache?.has(file.path) === true) {
    const cachedFile = await cache?.get(file.path)
    // If the modtime is still the same, we can apply the cache.
    if (cachedFile !== undefined && cachedFile.modtime === file.modtime && cachedFile.type === 'code') {
      file = applyCache(cachedFile, file)
      hasCache = true
    }
  }

  if (!hasCache) {
    // Read in the file, parse the contents and make sure to cache the file
    let content = await fs.readFile(filePath, { encoding: 'utf8' })
    parseFileContents(file, content)
    if (cache !== null) {
      await cacheFile(file, cache)
    }
  }

  return file
}

export async function search (fileObject: CodeFileDescriptor, terms: SearchTerm[]): Promise<SearchResult[]> {
  // Initialise the content variables (needed to check for NOT operators)
  let cnt = await fs.readFile(fileObject.path, { encoding: 'utf8' })
  return searchFile(fileObject, terms, cnt)
}
