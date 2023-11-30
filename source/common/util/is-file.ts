/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check a file.
 *
 * END HEADER
 */

import { lstatSync } from 'fs'

/**
 * Checks if a given path is a valid file
 *
 * @param  {string}  p The path to check
 *
 * @return {boolean}   True, if it is a valid path + file, and false if not
 */
export default function isFile (p: string): boolean {
  try {
    let s = lstatSync(p)
    return s.isFile()
  } catch (err) {
    return false
  }
}
