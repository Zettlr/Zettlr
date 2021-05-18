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
const uuid = require('uuid').v4
const path = require('path')

/**
 * Generates a new filename based on the configured filename pattern.
 * @return {string} The new filename.
 */
module.exports = function () {
  let pattern = global.config.get('newFileNamePattern')
  pattern = replaceStringVariables(pattern)
  pattern = pattern.replace(/%id/g, generateId(global.config.get('zkn.idGen')))
  // In case a funny guy has removed the pattern from config.
  if (pattern.trim().length === 0) pattern = uuid()
  // Make sure there's an ending
  if (path.extname(pattern).length < 2) pattern += '.md'
  return pattern
}
