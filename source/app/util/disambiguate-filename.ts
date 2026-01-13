/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        disambiguateFilename
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Takes in a file path and returns a file path that does not
 *                  yet exists. Useful if you want to back up a file and don't
 *                  have a logical filename convention for this. Uses a
 *                  time-based strategy.
 *
 * END HEADER
 */

import path from 'path'
import { promises as fs, constants as FSConstants } from 'fs'
import isDir from 'source/common/util/is-dir'
import { DateTime } from 'luxon'

/**
 * Checks if a given absolute path exists on disk. This does not care about
 * whether it's a folder or file.
 *
 * @param   {string}  absPath  The absolute path to check
 * @param   {number}  mode     The mode to check. Defaults to R_OK.
 *                             (Must be constants from `fs.constants`)
 *
 * @return  {boolean}           Whether the path exists.
 */
async function pathExists (absPath: string, mode = FSConstants.R_OK): Promise<boolean> {
  try {
    await fs.access(absPath, mode)
    return true
  } catch (err) {
    return false
  }
}

/**
 * Disambiguates the provided filepath using a time-based strategy, until a
 * filename is found that does not yet exist at the provided directory location.
 * For example, this turns `/path/to/stats.json` into
 * `/path/to/stats-20260113145823.json`, if `stats.json` already exists, but it
 * will return `/path/to/stats.json` if that path does not yet exist.
 *
 * @param   {string}           filepath  The filepath to check
 *
 * @return  {Promise<string>}            The disambiguated name.
 */
export async function disambiguateFile (filepath: string): Promise<string> {
  if (!await pathExists(filepath)) {
    return filepath
  }

  const dirpath = path.dirname(filepath)
  const extname = path.extname(filepath)
  const filenameBase = path.basename(filepath, extname)

  if (!isDir(dirpath)) {
    throw new Error(`Cannot disambiguate file ${path.basename(filepath)}: Parent directory does not exist.`)
  }

  const now = DateTime.now()
  let offsetSeconds = 0

  const genSuffix = (offset: number) => {
    return now.plus({ seconds: offset }).toFormat('yyyyMMddHHmmss')
  }

  let dateOffset = genSuffix(offsetSeconds)
  while (await pathExists(path.join(dirpath, `${filenameBase}-${dateOffset}${extname}`))) {
    offsetSeconds++
    dateOffset = genSuffix(offsetSeconds)
  }

  return path.join(dirpath, `${filenameBase}-${dateOffset}${extname}`)
}
