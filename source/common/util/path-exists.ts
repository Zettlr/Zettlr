/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Patrik Andersson
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check if a path exists.
 *
 * END HEADER
 */

import { constants, type PathLike, promises } from 'fs'

/**
 * Check if a path exists.
 *
 * @param   {PathLike}  p  path to be tested
 * @return  {boolean}      true if the path exists otherwise false
 */
export default async function pathExists (p: PathLike): Promise<boolean> {
  try {
    await promises.access(p, constants.F_OK)
    return true
  } catch (err) {
    return false
  }
}
