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

const fs = require('fs')

/**
 * Checks if a given path is a valid file
 * @param  {String}  p The path to check
 * @return {Boolean}   True, if it is a valid path + file, and false if not
 */
module.exports = function (p) {
  try {
    let s = fs.lstatSync(p)
    return s.isFile()
  } catch (e) {
    return false
  }
}
