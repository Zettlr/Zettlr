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
import moment from 'moment'

/**
 * A utility function that can replace a bunch of variables in strings, used
 * for the pattern generators (ID and filename)
 * @param       {string} string The input string
 * @return      {string}        The output string, with all %-variables replaced
 */
export default function replaceStringVariables (string: string): string {
  // Get the current date
  const d = moment()

  // Now generate the id by replacing all placeholders in the pattern
  return string
    .replace(/%Y/g, d.format('YYYY'))
    .replace(/%y/g, d.format('YY'))
    .replace(/%M/g, d.format('MM'))
    .replace(/%D/g, d.format('DD'))
    .replace(/%W/g, d.format('WW'))
    .replace(/%h/g, d.format('HH'))
    .replace(/%m/g, d.format('mm'))
    .replace(/%s/g, d.format('ss'))
    .replace(/%X/g, d.format('X'))
    .replace(/%uuid4/g, uuid4())
}
