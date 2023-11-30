/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        enumLangFiles
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This utility function returns a list of all available
 *                  translations, both provided by the app and available in the
 *                  "lang" directory in the user data. Translations in the
 *                  userData have higher priority since these also contain updates.
 *
 * END HEADER
 */

import { type Candidate } from './find-lang-candidates'
import path from 'path'
import * as bcp47 from 'bcp-47/index.js'
import fs from 'fs'
import isFile from './is-file'
import { app } from 'electron'

export interface LangFileMetadata {
  path: string
}

/**
 * Enumerates all language files available to load, based on the given search paths.
 * @param  {Array} [paths=[]] An array of paths to search for. Optional.
 * @return {Array}       An array containing metadata for all found files.
 */
export default function enumLangFiles (paths = [ path.join(app.getPath('userData'), '/lang'), path.join(__dirname, '/lang') ]): Array<Candidate & LangFileMetadata> {
  // Now go through all search paths and enumerate all available files of interest
  const candidates = []
  for (const p of paths) {
    for (const file of fs.readdirSync(p)) {
      // Sanity checks
      if (!isFile(path.join(p, file)) || path.extname(file) !== '.po') {
        continue
      }

      const schema = bcp47.parse(file.substring(0, file.lastIndexOf('.')))
      const tag = bcp47.stringify(schema)
      if (schema.language !== undefined && tag !== undefined) {
        candidates.push({ tag, path: path.join(p, file) })
      }
    }
  }
  return candidates
}
