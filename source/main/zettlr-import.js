/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrImport class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The importer is used to import various formats into Markdown
 *                  and save the resulting file somewhere inside the root tree
 *                  of the Zettlr instance.
 *
 * END HEADER
 */

const commandExists = require('command-exists').sync
const path = require('path')
const { exec } = require('child_process')
const isDir = require('../common/util/is-dir')
const isFile = require('../common/util/is-file')
const { trans } = require('../common/lang/i18n.js')
const { app } = require('electron')
const fs = require('fs')
const ZIP = require('adm-zip')

const FILES = require('../common/data.json').import_files

/**
 * This function checks a given file list and checks how good it is at guessing
 * the file format. Also this is used to decide manually which files to import
 * and which not.
 * @param  {Array} fileList An array containing a file list. If it's a string, a directory is assumed which is then read.
 * @return {Object} A sanitised object containing all files with some detected attributes.
 */
function checkImportIntegrity (fileList) {
  // Security checks
  if (!Array.isArray(fileList) && isDir(fileList) && path.extname(fileList) !== '.textbundle') {
    // We have to read in the directory if it is one. (And make sure to account for textbundles)
    // (Re-)Reads this directory.
    try {
      fs.lstatSync(fileList)
    } catch (e) {
      // Complain big time
      throw Error(`${fileList} does not exist.`)
    }

    let base = fileList
    fileList = fs.readdirSync(fileList)

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

/**
 * Imports both textpacks and textbundles to the target directory.
 * @param  {Object} bundle The file object as returned by the integrity checker
 * @param  {String} target The destination directory
 * @return {void}        This thing only throws up.
 */
function importTextbundle (bundle, target) {
  if (bundle.knownFormat === 'textpack') {
    // We need to unzip it before importing.
    let file = new ZIP(bundle.path)
    file.extractAllTo(app.getPath('temp'), true) // Extract everything
    // Now modify the bundle so that the importer can do something with it
    let parent = file.getEntries()[0].entryName
    // It may be that there is no extra entry for the containing textbundle
    // directory. In that case, traverse up one level
    if (path.extname(parent) !== '.textbundle') parent = path.dirname(parent)
    // Second time check, in case the generating ZIP library has put an image
    // in the assets folder at entry position 0.
    if (path.extname(parent) !== '.textbundle') parent = path.dirname(parent)
    bundle.path = path.join(app.getPath('temp'), parent)
    bundle.knownFormat = 'textbundle'
  }

  // Now we have for sure a textbundle which we can extract.
  let mdName = path.join(target.path, path.basename(bundle.path, path.extname(bundle.path))) + '.md'
  let assets = path.join(target.path, 'assets')

  // First copy over the markdown file (which may have ANY extension)
  let bdl = fs.readdirSync(bundle.path)
  let foundMDFile = false
  for (let f of bdl) {
    if (f.indexOf('text.') === 0) {
      foundMDFile = true
      // Gotcha
      fs.copyFileSync(path.join(bundle.path, f), mdName)
      break
    }
  }

  if (!foundMDFile) throw new Error(trans('system.error.malformed_textbundle', path.basename(bundle.path)))

  // Now the assets
  try {
    bdl = fs.readdirSync(path.join(bundle.path, 'assets'))
  } catch (e) {
    throw new Error(trans('system.error.malformed_textbundle', path.basename(bundle.path)))
  }

  if (bdl.length > 0) {
    // If there are assets to be copied, make sure the directory exists
    try {
      fs.lstatSync(assets)
    } catch (e) {
      fs.mkdirSync(assets)
    }
  }

  // Now simply copy over all files
  for (let f of bdl) {
    if (isFile(path.join(bundle.path, 'assets', f))) {
      fs.copyFileSync(path.join(bundle.path, 'assets', f), path.join(assets, f))
    }
  }

  // Import should be complete now
}

/**
 * This function takes an array of file names and imports it using pandoc. Two
 * callbacks can be provided to receive information on successful and failed
 * imports.
 * @param       {Array} fileOrFolder           An array containing absolute paths.
 * @param       {ZettlrDir} dirToImport            The directory to which to import.
 * @param       {Function} [errorCallback=null]   If given, called if an error occurs.
 * @param       {Function} [successCallback=null] If given, called on every successful export.
 * @constructor
 */
function ZettlrImport (fileOrFolder, dirToImport, errorCallback = null, successCallback = null) {
  if (!commandExists('pandoc')) {
    throw Error(trans('system.error.no_pandoc_message'))
  }

  let files = checkImportIntegrity(fileOrFolder)
  let failedFiles = []

  // This for loop will initiate all pandoc instances at once. The return of
  // these processes will come in asynchronously, so we can let chokidar handle
  // the detection.
  for (let file of files) {
    // There are two files that we cannot import using pandoc: textbundle and textpack.
    if (file.knownFormat === 'textbundle' || file.knownFormat === 'textpack') {
      // We need to import using a special importer.
      importTextbundle(file, dirToImport)
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

module.exports = ZettlrImport
