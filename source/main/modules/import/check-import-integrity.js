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

const path = require('path')
const fs = require('fs').promises

const isDir = require('../../../common/util/is-dir')
const isFile = require('../../../common/util/is-file')

const FILES = require('../../../common/data.json').import_files

/**
* This function checks a given file list and checks how good it is at guessing
* the file format. Also this is used to decide manually which files to import
* and which not.
* @param  {Array} fileList An array containing a file list. If it's a string, a directory is assumed which is then read.
* @return {Object} A sanitised object containing all files with some detected attributes.
*/
module.exports = async function checkImportIntegrity (fileList) {
  // Security checks
  if (!Array.isArray(fileList) && isDir(fileList) && path.extname(fileList) !== '.textbundle') {
    // We have to read in the directory if it is one. (And make sure to account for textbundles)
    // (Re-)Reads this directory.
    try {
      await fs.lstat(fileList)
    } catch (e) {
      // Complain big time
      throw Error(`${fileList} does not exist.`)
    }

    let base = fileList
    fileList = await fs.readdir(fileList)

    // Convert to absolute paths
    for (let i = 0; i < fileList.length; i++) {
      fileList[i] = path.join(base, fileList[i])
    }
  }

  // It may be that the user did indeed not provide a directory, but also not
  // an array. In this case, abort.
  if (!Array.isArray(fileList)) {
    throw Error('The file list was not an array.')
  }

  // Now do the integrity check.
  let resList = []

  for (let file of fileList) {
    // Is this a standard file? Textbundle is a directory, so make sure we check for that.
    if (!isFile(file) && path.extname(file) !== '.textbundle') {
      continue
    }

    // Guess the file format from the extension.
    let ext = path.extname(file)
    let detectedFile = { 'path': file, 'knownFormat': false }

    for (let format of FILES) {
      if (format.includes(ext)) {
        // Known extension, we can go further
        detectedFile.knownFormat = format[0]
        break
      }
    }

    resList.push(detectedFile)
  }
  return resList
}
