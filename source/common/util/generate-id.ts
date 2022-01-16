/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to generate an ID
 *
 * END HEADER
 */

import replaceStringVariables from './replace-string-variables'

/**
 * This function generates an ID using the given pattern (default: YYYYMMDDhhmmss)
 * by replacing any variables within said pattern.
 *
 * @param   {String}  [pattern='%Y%M%D%h%m%s']  The pattern to apply
 *
 * @return  {String}                            The final string after replacements.
 */
export default function generateId (pattern: string = '%Y%M%D%h%m%s'): string {
  return replaceStringVariables(pattern)
}
