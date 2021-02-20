/**
 * This file is responsible for updating both the
 * CSL locales and the corresponding CSL Style
 * that is shipped with the app. It simply downloads
 * the current version of the repositories and
 * writes it to the correct directories:
 *
 * ./source/main/assets/csl-locales
 * and
 * ./source/main/assets/csl-styles
 */

// This script requires a previous yarn/npm install.
const got = require('got')
const fs = require('fs').promises
const path = require('path')
const log = require('./console-colour.js') // Colourful output
const ZIP = require('adm-zip')
const rimraf = require('rimraf')

// The locales-URL returns an array with all files in that directory, incl. their download URL.
// const REPO_LOCALES_URL = 'https://api.github.com/repos/citation-style-language/locales/contents'
const REPO_LOCALES_URL = 'https://github.com/citation-style-language/locales/archive/master.zip'
const STYLE_URL = 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-author-date.csl'

const LOCALES_TARGET_DIRECTORY = path.join(__dirname, '../source/app/service-providers/assets/csl-locales')
const STYLES_TARGET_DIRECTORY = path.join(__dirname, '../source/app/service-providers/assets/csl-styles')

// First, let's download the list of contents from
// the GitHub API.
async function getCSLLocales () {
  // Prepare paths that we need
  let resPath = path.join(__dirname, '../resources')
  let localesZip = path.join(resPath, 'csl.zip')
  // NOTE: localesUnzip is the path we will get when we unzip csl.zip
  let localesUnzip = path.join(resPath, 'locales-master')

  // First, download the ZIP
  log.info(`Retrieving ZIP with locales from ${REPO_LOCALES_URL} ...`)
  let responseBody = await got(REPO_LOCALES_URL, { method: 'GET' }).buffer()
  log.info('Done! Saving ZIP to disk ...')
  // Alright, we only need the body, save it as a zip
  await fs.writeFile(localesZip, responseBody)

  // Next, we need to unzip that thing. We'll reuse some code from the
  // textbundle import for this
  log.info(`Done! Unzipping file to ${localesUnzip} ...`)
  let cslLocalesZIP = new ZIP(localesZip)
  cslLocalesZIP.extractAllTo(resPath, true) // This will create the "locales-master" dir
  log.info('Done! Extracting locales files from directory ...')

  // Read in the directory, and then we are pretty much where the old code
  // was - filter the file names, expand them to the full path and then copy
  // them over one by one
  let directoryContents = await fs.readdir(localesUnzip)
  directoryContents = directoryContents.filter(elem => /^locales/.test(elem))
  directoryContents = directoryContents.map(elem => path.join(localesUnzip, elem))
  log.info('Done! Copying over locales-files ...')

  for (let filePath of directoryContents) {
    let basename = path.basename(filePath)
    log.info(`Copying ${basename} ...`)
    let targetPath = path.join(LOCALES_TARGET_DIRECTORY, basename)
    await fs.rename(filePath, targetPath)
    log.success(`Successfully written ${basename}!`)
  }

  // Finally, update the CSL style
  log.info('Updating CSL style ...')
  let response = await got(STYLE_URL, { method: 'GET' })
  response = response.body
  let basename = path.basename(STYLE_URL)
  let targetPath = path.join(STYLES_TARGET_DIRECTORY, basename)
  await fs.writeFile(targetPath, response, 'utf8')
  log.success('Updated CSL style!')

  log.info('Cleaning up ...')
  try {
    await fs.unlink(localesZip)
    await new Promise((resolve, reject) => {
      rimraf(localesUnzip, (err) => {
        if (err) reject(err)
        else resolve()
      })
    })
  } catch (e) {
    log.error(`An error occurred during cleanup: ${e.message}. Please remove the files manually.`)
  }
}

// Execute the functions
getCSLLocales().then(() => {
  log.success('Successfully updated the locales.')
}).catch((err) => {
  log.error('Could not update CSL files: An error occurred.')
  console.error(err)
  // We have to exit the process with an
  // error signal for correct behaviour on CI
  process.exit(1)
})
