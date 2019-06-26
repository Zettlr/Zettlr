/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to localise numbers.
 *
 * END HEADER
 */

const { trans } = require('../lang/i18n')

/**
 * Adds delimiters to numbers.
 * @param  {Number} number The number to be localised.
 * @return {String}        The number with delimiters.
 */
module.exports = function (number) {
  if (typeof number !== 'number' || number < 1000) {
    return number
  }

  let delim = trans('localise.thousand_delimiter')
  // No delimiter available -> fallback
  if (delim.length > 1) delim = '.'

  let ret = ''
  ret = number.toString()
  let cnt = 0
  for (let i = ret.length - 1; i > 0; i--) {
    cnt++
    if (cnt === 3) {
      ret = ret.substr(0, i) + delim + ret.substr(i)
      cnt = 0
    }
  }

  return ret
}
