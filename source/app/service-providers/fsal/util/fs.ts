/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Filesystem utilities
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A set of small file system utilities for ease of access.
 *
 * END HEADER
 */
import { promises as fs, constants as FS_CONSTANTS } from 'fs'

/**
 * Checks if a given path exists on the file system. Optional flags can be
 * passed to check specific access rights. By default, will check for general
 * access (i.e., the process can see the file), and read access, but not write
 * access. Use fs.constants as flags.
 *
 * @param   {string}            absPath  The path to check
 * @param   {number|undefined}  flags    Optional mode check flags
 *
 * @return  {Promise<boolean>}           Resolves to true or false
 */
export async function pathExists (absPath: string, flags: number = FS_CONSTANTS.F_OK|FS_CONSTANTS.R_OK): Promise<boolean> {
  try {
    await fs.access(absPath, flags)
    return true
  } catch (err: any) {
    return false
  }
}
