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

import { type PathLike, existsSync } from 'fs'

/**
 * Check if a path exists.
 *
 * @param   {PathLike}  p  path to be tested
 * @return  {boolean}      true if the path exists otherwise false
 */
export default function pathExists (p: PathLike): boolean {
  return existsSync(p)
}
