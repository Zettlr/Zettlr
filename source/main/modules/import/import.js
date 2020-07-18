/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrImport
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The importer module for Zettlr.
 *
 * END HEADER
 */

const commandExists = require('command-exists')
const fs = require('fs').promises
const path = require('path')
const { exec } = require('child_process')

const { trans } = require('../../../common/lang/i18n.js')

// Module utilities
const checkImportIntegrity = require('./check-import-integrity')
const importTextbundle = require('./import-textbundle')

module.exports = async function makeImport (fileOrFolder, dirToImport, errorCallback = null, successCallback = null) {
  if (!await commandExists('pandoc')) {
    throw Error(trans('system.error.no_pandoc_message'))
  }

  let files = await checkImportIntegrity(fileOrFolder)
  let failedFiles = []

  // This for loop will initiate all pandoc instances at once. The return of
  // these processes will come in asynchronously, so we can let chokidar handle
  // the detection.
  for (let file of files) {
    // There are two files that we cannot import using pandoc: textbundle and textpack.
    if (file.knownFormat === 'textbundle' || file.knownFormat === 'textpack') {
      // We need to import using a special importer.
      importTextbundle(file, dirToImport)
    } else if ([ 'markdown', 'txt' ].includes(file.knownFormat)) {
      // In this case we should just copy it over
      try {
        let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
        await fs.copyFile(file.path, newName)
        successCallback(file.path)
      } catch (err) {
        errorCallback(file.path, err.message)
      }
    } else if (file.knownFormat) {
      // The file is known -> let's import it!
      let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
      let cmd = `pandoc -f ${file.knownFormat} -t markdown -o "${newName}" --wrap=none --atx-headers "${file.path}"`

      exec(cmd, { 'cwd': dirToImport.path }, (error, stdout, stderr) => {
        if (error && errorCallback) {
          // Call the error callback function to let the initiator
          // handle errors (e.g. notifying the user).
          errorCallback(file.path, error)
        } else if (successCallback) {
          successCallback(file.path)
        }
      })
    } else { // If file.knownFormat evaluated to false
      failedFiles.push(file.path)
    }
  }

  return failedFiles // All good if the array is empty
}
