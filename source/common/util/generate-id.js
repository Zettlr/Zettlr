/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to generate an ID
 *
 * END HEADER
 */

const replaceStringVariables = require('./replace-string-variables.js')

/**
* This function generates a (per second unique) ID to be inserted into the editor
* @return {String} An id in the format "YYYYMMDDHHMMSS"
*/
module.exports = function (pattern = '%Y%M%D%h%m%s') {
  return replaceStringVariables(pattern)
}
