/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getFilesystemMetadata function
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function retrieves basic information for a given path
 *                  from the filesystem in a structured manner.
 *
 * END HEADER
 */

import { promises as fs } from 'fs'

/**
 * Filesystem Metadata struct that contains info on basic data of a given FS node.
 */
export interface FilesystemMetadata {
  /**
   * The absolute path to the object
   */
  path: string
  /**
   * Whether this object is a directory
   */
  isDirectory: boolean
  /**
   * Whether this object is a file
   */
  isFile: boolean
  /**
   * The time at which the file or directory has been created (UNIX timestamp
   * milliseconds)
   */
  birthtime: number
  /**
   * The last modification to this file or directory (UNIX timestamp
   * milliseconds)
   */
  modtime: number
  /**
   * The size of the file or directory on disk, in bytes
   */
  size: number
  /**
   * Do we have read access to the file or directory?
   */
  readable: boolean
  /**
   * Do we have write access to the file or directory?
   */
  writeable: boolean
}

/**
 * Takes an absolute file path and returns a set of basic information for the
 * filePath. This function will throw if the file is inaccessible, either
 * because it does not exist, or because the file is not visible to the process.
 *
 * @param   {string}                       fileOrDirPath  The path to check
 *
 * @return  {Promise<FilesystemMetadata>}                 Resolves with metadata
 *                                                        or throws an error.
 */
export async function getFilesystemMetadata (fileOrDirPath: string): Promise<FilesystemMetadata> {
  // First, check if we can even access/see the file. Let the check throw if not
  await fs.access(fileOrDirPath, fs.constants.F_OK)

  const metadata: FilesystemMetadata = {
    path: fileOrDirPath,
    isDirectory: false,
    isFile: false,
    birthtime: 0,
    modtime: 0,
    size: 0,
    readable: false,
    writeable: false
  }

  // Access the info we require
  const stat = await fs.stat(fileOrDirPath)

  metadata.birthtime = stat.birthtimeMs
  metadata.modtime = stat.mtimeMs
  metadata.size = stat.size
  metadata.isDirectory = stat.isDirectory()
  metadata.isFile = stat.isFile()

  // Determine read/write status
  try {
    await fs.access(fileOrDirPath, fs.constants.R_OK)
    metadata.readable = true
  } catch (err: any) {}

  try {
    await fs.access(fileOrDirPath, fs.constants.W_OK)
    metadata.writeable = true
  } catch (err: any) {}

  return metadata
}
