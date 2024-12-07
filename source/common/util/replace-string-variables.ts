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

import { v4 as uuid4 } from 'uuid'
import { DateTime } from 'luxon'

/**
 * A utility function that can replace a bunch of variables in strings, used
 * for the pattern generators (ID and filename)
 *
 * @param   {string}    text  The input string
 * @param   {DateTime}  now   Optional, the timestamp, defaults to now
 * @return  {string}          The output string, with all %-variables replaced
 */
export default function replaceStringVariables (text: string, now?: DateTime): string {
  // Get the current date
  if (now === undefined) {
    now = DateTime.now() // .setLocale('en-GB')
  }

  // Now generate the id by replacing all placeholders in the pattern
  // cf. documentation for these: https://moment.github.io/luxon/#/formatting?id=table-of-tokens
  return text
    .replace(/%Y/g, now.toFormat('y'))   // 4-digit year
    .replace(/%y/g, now.toFormat('yy'))  // 2-digit year
    .replace(/%M/g, now.toFormat('LL'))  // 2-digit month
    .replace(/%D/g, now.toFormat('dd'))  // 2-digit day
    .replace(/%W/g, now.toFormat('WW'))  // 2-digit ISO week
    .replace(/%h/g, now.toFormat('HH'))  // 2-digit 24-hour
    .replace(/%m/g, now.toFormat('mm'))  // 2-digit minute
    .replace(/%s/g, now.toFormat('ss'))  // 2-digit second
    .replace(/%X/g, now.toFormat('X'))   // UNIX timestamp (seconds)
    .replace(/%o/g, now.toFormat('ooo')) // 3-digit ordinal day of year
    .replace(/%uuid4/g, uuid4())
}
