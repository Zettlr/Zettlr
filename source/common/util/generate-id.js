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
 * This function generates an ID using the given pattern (default: YYYYMMDDhhmmss)
 * by replacing any variables within said pattern.
 *
 * @param   {String}  [pattern='%Y%M%D%h%m%s']  The pattern to apply
 *
 * @return  {String}                            The final string after replacements.
 */
module.exports = function (pattern = '%Y%M%D%h%m%s') {
  return replaceStringVariables(pattern)
}
