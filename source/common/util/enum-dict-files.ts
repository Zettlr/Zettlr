/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        enumDictFiles
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function returns a list of all available dictionaries,
 *                  more specifically, the absolute paths to both the Affix and
 *                  Dic files of said dictionaries. It collects both provided
 *                  dictionaries and user-downloaded ones.
 *
 * END HEADER
 */

import { type Candidate } from './find-lang-candidates'
import path from 'path'
import * as bcp47 from 'bcp-47/index.js'
import fs from 'fs'
import { app } from 'electron'
import isDir from './is-dir'
import isFile from './is-file'

export interface DictFileMetadata {
  aff: string
  dic: string
}

/**
 * Enumerates all available dictionaries within the specified search paths.
 * @param  {Array} [paths=[]] An array of paths to be searched. Defaults to standard paths.
 * @return {Array}       An array containing metadata for all found dictionaries.
 */
export default function enumDictFiles (paths = [ path.join(app.getPath('userData'), '/dict'), path.join(__dirname, 'dict') ]): Array<Candidate & DictFileMetadata> {
  let candidates: Array<Candidate & DictFileMetadata> = []

  for (let p of paths) {
    let list = fs.readdirSync(p)
    for (let dir of list) {
      if (!isDir(path.join(p, dir))) {
        continue
      }
      let schema = bcp47.parse(dir)
      if (schema.language !== undefined) {
        // Additional check to make sure the dictionaries are complete.
        let aff = path.join(p, dir, dir + '.aff')
        let dic = path.join(p, dir, dir + '.dic')
        if (!isFile(aff) || !isFile(dic)) {
          // Second try: index-based names
          aff = path.join(p, dir, 'index.aff')
          dic = path.join(p, dir, 'index.dic')
          if (!isFile(aff) || !isFile(dic)) {
            continue
          }
        }
        // Only add the found dictionary if it is not already present. Useful
        // to override the shipped dictionaries.
        if (candidates.find(elem => elem.tag === dir) === undefined) {
          candidates.push({ tag: dir, aff, dic })
        }
      }
    }
  }
  return candidates
}
