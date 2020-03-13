/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to replace certain variables.
 *
 * END HEADER
 */

const uuid4 = require('uuid').v4
const moment = require('moment')

/**
 * A utility function that can replace a bunch of variables in strings, used
 * for the pattern generators (ID and filename)
 * @param       {string} string The input string
 * @return      {string}        The output string, with all %-variables replaced
 */
module.exports = function (string) {
  // Get the current date
  let d = moment()

  // Now generate the id by replacing all placeholders in the pattern
  string = string.replace(/%Y/g, d.format('YYYY'))
  string = string.replace(/%M/g, d.format('MM'))
  string = string.replace(/%D/g, d.format('DD'))
  string = string.replace(/%W/g, d.format('WW'))
  string = string.replace(/%h/g, d.format('HH'))
  string = string.replace(/%m/g, d.format('mm'))
  string = string.replace(/%s/g, d.format('ss'))
  string = string.replace(/%uuid4/g, uuid4())

  return string
}
