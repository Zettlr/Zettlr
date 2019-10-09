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
  if (typeof number !== 'number' || (number < 1000 && number >= 0)) {
    return number.toString()
  }

  let delim = trans('localise.thousand_delimiter')
  let decimal = trans('localise.decimal_delimiter')
  // No delimiter available -> fallback
  if (delim === 'localise.thousand_delimiter') delim = '.'
  if (decimal === 'localise.decimal_delimiter') decimal = ','

  // Account for negative values
  let isNegative = false
  let suffix = ''
  if (number < 0) {
    isNegative = true
    number = Math.abs(number)
  }

  // If we have a float, we have a suffix
  if (number % 1 !== 0) {
    suffix = number.toString().split('.')[1]
    number = Math.floor(number)
  }

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

  // Re-append the suffix, if applicable
  ret = (suffix.length > 0) ? ret + decimal + suffix : ret

  // Re-prepend the minus sign
  return ((isNegative) ? '-' + ret : ret)
}
