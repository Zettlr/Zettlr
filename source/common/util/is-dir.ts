/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check a path.
 *
 * END HEADER
 */

import { lstatSync } from 'fs'

/**
 * Checks if a given path is a valid directory
 * @param  {string}  p The path to check
 *
 * @return {boolean}   True, if p is valid and also a directory
 */
export default function isDir (p: string): boolean {
  try {
    let s = lstatSync(p)
    return s.isDirectory()
  } catch (err) {
    return false
  }
}
