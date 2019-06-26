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

/**
 * A utility function that can replace a bunch of variables in strings, used
 * for the pattern generators (ID and filename)
 * @param       {string} string The input string
 * @return      {string}        The output string, with all %-variables replaced
 */
module.exports = function (string) {
  let date = new Date()
  let yyyy = date.getFullYear()
  let mm = date.getMonth() + 1
  if (mm <= 9) mm = '0' + mm
  let dd = date.getDate()
  if (dd <= 9) dd = '0' + dd
  let hh = date.getHours()
  if (hh <= 9) hh = '0' + hh
  let m = date.getMinutes()
  if (m <= 9) m = '0' + m
  let ss = date.getSeconds()
  if (ss <= 9) ss = '0' + ss

  // Now generate the id by replacing all placeholders in the pattern
  string = string.replace(/%Y/g, yyyy)
  string = string.replace(/%M/g, mm)
  string = string.replace(/%D/g, dd)
  string = string.replace(/%h/g, hh)
  string = string.replace(/%m/g, m)
  string = string.replace(/%s/g, ss)

  return string
}
