/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to replace certain
 *                  string variables.
 *
 * END HEADER
 */

const replaceStringVariables = require('./replace-string-variables.js')
const generateId = require('./generate-id')

/**
 * Generates a new filename based on the configured filename pattern.
 * @return {string} The new filename.
 */
module.exports = function () {
  let pattern = global.config.get('newFileNamePattern')
  pattern = replaceStringVariables(pattern)
  pattern = pattern.replace(/%id/g, generateId(global.config.get('zkn.idGen')))
  return pattern
}
