/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        checkImportIntegrity
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Checks that all files to import are valid for import.
 *
 * END HEADER
 */

import path from 'path'
import isFile from '@common/util/is-file'

import { import_files as FILES } from '@common/data.json'

/**
* This function checks a given file list and checks how good it is at guessing
* the file format. Also this is used to decide manually which files to import
* and which not.
* @param  {Array} fileList An array containing a file list. If it's a string, a directory is assumed which is then read.
* @return {Object} A sanitised object containing all files with some detected attributes.
*/
export default async function checkImportIntegrity (fileList: string[]): Promise<any[]> {
  // Now do the integrity check.
  const resList = []

  for (let file of fileList) {
    // Is this a standard file? Textbundle is a directory, so make sure we check for that.
    if (!isFile(file) && path.extname(file) !== '.textbundle') {
      continue
    }

    // Guess the file format from the extension.
    let ext = path.extname(file).substr(1).toLowerCase()
    let detectedFile = {
      'path': file,
      'knownFormat': ''
    }

    for (let format of FILES) {
      if (format.slice(2).includes(ext)) {
        // Known extension, we can go further
        detectedFile.knownFormat = format[0]
        break
      }
    }

    // Pandoc requires the "latex" reader, not the "tex" reader
    if (detectedFile.knownFormat === 'tex') {
      detectedFile.knownFormat = 'latex'
    }

    // Same for "wiki" files: We use VimWiki
    if (detectedFile.knownFormat === 'wiki') {
      detectedFile.knownFormat = 'vimwiki'
    }

    resList.push(detectedFile)
  }
  return resList
}
