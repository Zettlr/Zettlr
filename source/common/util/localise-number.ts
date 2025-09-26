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

import { trans } from '../i18n-renderer'

/**
 * Adds delimiters to numbers.
 *
 * @param  {number} number The number to be localised.
 *
 * @return {string}        The number with delimiters.
 */
export default function (number: number): string {
  if (typeof number !== 'number' || (number < 1000 && number >= 0)) {
    return number.toString()
  }

  if (!Number.isFinite(number)) {
    return number.toString()
  }

  let delim = trans(',')
  let decimal = trans('.')
  // No delimiter available -> fallback
  if (delim === 'localise.thousand_delimiter') {
    delim = '.'
  }

  if (decimal === 'localise.decimal_delimiter') {
    decimal = ','
  }

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
      ret = ret.substring(0, i) + delim + ret.substring(i)
      cnt = 0
    }
  }

  // Re-append the suffix, if applicable
  ret = (suffix.length > 0) ? ret + decimal + suffix : ret

  // Re-prepend the minus sign
  return ((isNegative) ? '-' + ret : ret)
}
