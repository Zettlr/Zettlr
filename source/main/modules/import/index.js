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
const { spawn } = require('child_process')

const { trans } = require('../../../common/i18n.js')

// Module utilities
const checkImportIntegrity = require('./check-import-integrity')
const importTextbundle = require('./import-textbundle')

module.exports = async function makeImport (fileOrFolder, dirToImport, errorCallback = null, successCallback = null) {
  const useBundledPandoc = Boolean(global.config.get('export.useBundledPandoc'))
  const bundledPandoc = process.env.PANDOC_PATH !== undefined
  const isAppleSilicon = process.platform === 'darwin' && process.arch === 'arm64'
  const pandocFound = Boolean(await commandExists('pandoc'))
  // We cannot import either if the Pandoc command does not exist or there is
  // no bundled Pandoc.
  if (!pandocFound && !(useBundledPandoc && bundledPandoc)) {
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
      // Determine whether to use the bundled Pandoc
      let binary = 'pandoc'
      if (bundledPandoc && useBundledPandoc) {
        // DEBUG: Remove after Zettlr 1.9
        global.log.info(`[Import] Using the bundled Pandoc binary at ${process.env.PANDOC_PATH}`)
      }

      if (bundledPandoc && useBundledPandoc && isAppleSilicon) {
        // On Apple M1/ARM64 chips, we need to run the 64 bit Intel-compiled Pandoc
        // through Rosetta 2, which we can do by prepending with arch -x86_64.
        global.log.info('[Import] Using Rosetta 2 to run Pandoc...')
        binary = 'arch -x86_64 ' + binary
      }

      // The file is known -> let's import it!
      let newName = path.join(dirToImport.path, path.basename(file.path, path.extname(file.path))) + '.md'
      // let cmd = `${binary} -f ${file.knownFormat} -t markdown -o "${newName}" --wrap=none --atx-headers "${file.path}"`
      const argv = [
        '-t', 'markdown',
        '-o', newName,
        '--wrap=none', '--atx-headers',
        file.path
      ]

      const pandocProcess = spawn(binary, argv, {
        cwd: dirToImport.path,
        windowsHide: true
      })

      const output = []
      pandocProcess.stdout.on('data', (data) => {
        output.push(String(data))
      })

      pandocProcess.on('close', (code, signal) => {
        // Code should be 0
        if (code === 0) {
          successCallback(file.path)
        } else {
          errorCallback(file.path)
        }
      })

      pandocProcess.on('error', (err) => {
        errorCallback(file.path, err)
      })

      // exec(cmd, { 'cwd': dirToImport.path }, (error, stdout, stderr) => {
      //   if (error && errorCallback) {
      //     // Call the error callback function to let the initiator
      //     // handle errors (e.g. notifying the user).
      //     errorCallback(file.path, error)
      //   } else if (successCallback) {
      //     successCallback(file.path)
      //   }
      // })
    } else { // If file.knownFormat evaluated to false
      failedFiles.push(file.path)
    }
  }

  return failedFiles // All good if the array is empty
}
