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

const fs = require('fs')

/**
 * Checks if a given path is a valid directory
 * @param  {string}  p The path to check
 *
 * @return {boolean}   True, if p is valid and also a directory
 */
module.exports = function (p) {
  try {
    let s = fs.lstatSync(p)
    return s.isDirectory()
  } catch (err) {
    return false
  }
}
