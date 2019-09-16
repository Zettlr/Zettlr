/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to check for ignored files.
 *
 * END HEADER
 */

const path = require('path')

// Supported filetypes
const filetypes = require('../data.json').filetypes

/**
* Returns true, if a given file should be ignored.
* @param  {String} p The path to the file.
* @return {Boolean}   True or false, depending on whether the file should be ignored.
*/
module.exports = function (p) {
  let ext = path.extname(p).toLowerCase()
  // Check for RMarkdown files
  if (ext === '.rmd' && global.config.get('enableRMarkdown')) return false
  return (!filetypes.includes(ext))
}
