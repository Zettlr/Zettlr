/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for ignored dirs.
 *
 * END HEADER
 */

import path from 'path'

// Ignored directory patterns
import { ignoreDirs } from '../data.json'

/**
* Returns true, if a directory should be ignored, and false, if not.
* @param  {String} p The path to the directory. It will be checked against some regexps.
* @return {Boolean}   True or false, depending on whether or not the dir should be ignored.
*/
export default function ignoreDir (p: string): boolean {
  let name = path.basename(p)
  // Directories are ignored on a regexp basis
  for (let re of ignoreDirs) {
    let regexp = new RegExp(re, 'i')
    if (regexp.test(name)) {
      return true
    }
  }

  return false
}
