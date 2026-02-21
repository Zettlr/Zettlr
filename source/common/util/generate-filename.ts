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

import replaceStringVariables from './replace-string-variables'
import generateId from './generate-id'

/**
 * Generates a new filename based on the configured filename pattern.
 * @param {string} filenamePattern - The pattern for generating filenames.
 * @param {string} idGenPattern - The pattern for generating unique IDs.
 * @param {string} ext - The file extension to be used (default: 'md').
 * @return {string} The new filename.
 */
export default function generateFilename (filenamePattern: string, idGenPattern: string, ext: string ): string {
  
  let pattern = replaceStringVariables(filenamePattern)
  

  pattern = pattern.replace(/%id/g, generateId(idGenPattern))
  
  ext = ext || 'md'
  pattern = pattern.replace(/%ext/g, ext)
  

  return pattern
}

