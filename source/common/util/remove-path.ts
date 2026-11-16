/**
 * BEGIN HEADER
 *
 * Contains:        removePath
 * CVM-Role:        Utility
 * Maintainer:      benniekiss
 * License:         GNU GPL v3
 *
 * Description:     Remove a file or directory.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs, type RmOptions } from 'fs'

/**
 * Remove a path from the filesystem.
 *
 * If `filepath` is a directory and `recursive` is true, it and all of its contents are removed.
 *
 * If `filepath` is the root directory, the path is not removed and an error is thrown.
 *
 * @param {string}      filepath  The filepath to remove.
 * @param {RmOptions}   opts      Options to pass to `fs.rm`
 *
 **/
export default async function removePath (filepath: string, opts: RmOptions = {}): Promise<void> {
  const resolved = path.resolve(filepath)

  // Prevent removing the root directory, just in case.
  if (path.parse(resolved).root === resolved) {
    throw new Error(`Refusing to remove path: ${filepath}`)
  }

  return await fs.rm(resolved, {
    // These two options should help in cases of flaky windows removals.
    maxRetries: 5,
    retryDelay: 100,
    ...opts,
  })
}

