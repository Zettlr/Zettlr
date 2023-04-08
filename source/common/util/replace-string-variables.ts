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
 * @param       {string} string The input string
 * @return      {string}        The output string, with all %-variables replaced
 */
export default function replaceStringVariables (string: string, now?: DateTime): string {
  // Get the current date
  if (now === undefined) {
    now = DateTime.now() // .setLocale('en-GB')
  }

  // BUG: See Luxon issue https://github.com/moment/luxon/issues/1418
  const second = now.toLocaleString({ second: '2-digit' })

  // Now generate the id by replacing all placeholders in the pattern
  return string
    .replace(/%Y/g, now.toLocaleString({ year: 'numeric' }))
    .replace(/%y/g, now.toLocaleString({ year: '2-digit' }))
    .replace(/%M/g, now.toLocaleString({ month: '2-digit' }))
    .replace(/%D/g, now.toLocaleString({ day: '2-digit' }))
    .replace(/%W/g, String(now.weekNumber))
    .replace(/%h/g, now.toLocaleString({ hour: '2-digit', hour12: false }))
    .replace(/%m/g, now.toLocaleString({ minute: '2-digit' }))
    .replace(/%s/g, second.length === 2 ? second : '0' + second)
    .replace(/%X/g, String(now.toUnixInteger()))
    .replace(/%uuid4/g, uuid4())
}
