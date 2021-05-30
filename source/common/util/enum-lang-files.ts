import { Candidate } from './find-lang-candidates'
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
  let candidates = []
  for (let p of paths) {
    let list = fs.readdirSync(p)
    for (let file of list) {
      // Sanity checks
      if (!isFile(path.join(p, file))) continue
      if (path.extname(file) !== '.json') continue

      let schema = bcp47.parse(file.substr(0, file.lastIndexOf('.')))
      if (schema.language !== undefined) {
        candidates.push({
          'tag': bcp47.stringify(schema),
          'path': path.join(p, file)
        })
      }
    }
  }
  return candidates
}
