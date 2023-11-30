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
import { v4 as uuid } from 'uuid'

/**
 * Generates a new filename based on the configured filename pattern.
 * @return {string} The new filename.
 */
export default function generateFilename (filenamePattern: string, idGenPattern: string): string {
  let pattern = replaceStringVariables(filenamePattern)
  pattern = pattern.replace(/%id/g, generateId(idGenPattern))
  // In case a funny guy has removed the pattern from config.
  if (pattern.trim().length === 0) {
    pattern = uuid()
  }

  return pattern
}
