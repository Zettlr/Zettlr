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

// The locales-URL returns an array with all files in that directory, incl. their download URL.
const REPO_LOCALES_URL = 'https://api.github.com/repos/citation-style-language/locales/contents'
const STYLE_URL = 'https://raw.githubusercontent.com/citation-style-language/styles/master/chicago-author-date.csl'
// First, let's download the list of contents from
// the GitHub API.
async function getCSLLocales () {
  let response = await got(REPO_LOCALES_URL, { method: 'GET' })
  // Alright, we only need the body
  let files = JSON.parse(response.body)

  // Now filter out all those that do not start with "locales", because
  // we only need those.
  files = files.filter(elem => /^locales/.test(elem.name))

  // Now map-reduce these objects to only the download_url
  files = files.map(elem => elem.download_url)

  // Now, for each file, get its contents and write it to the corresponding file on disk!
  for (let file of files) {
    let basename = path.basename(file)
    log.info(`Receiving file ${basename} ...`)
    let filecontents = await got(file, { method: 'GET' })
    filecontents = filecontents.body // As always, we're only interested in the body.
    log.verbose('Done. Writing to disk ...')
    let targetPath = path.join(__dirname, '../source/main/assets/csl-locales', basename)

    await fs.writeFile(targetPath, filecontents, 'utf8')
    log.success(`Successfully updated ${basename}!`)
  }

  // Finally, update the CSL style
  log.info('Updating CSL style ...')
  response = await got(STYLE_URL, { method: 'GET' })
  response = response.body
  let basename = path.basename(STYLE_URL)
  let targetPath = path.join(__dirname, '../source/main/assets/csl-styles', basename)
  await fs.writeFile(targetPath, response, 'utf8')
  log.success('Updated CSL style!')
}

// Execute the functions
getCSLLocales().then(() => { console.log('Successfully updated the locales.') })
  .catch((err) => {
    console.error('An unexpected error occurred!', err)
    // We have to exit the process with an
    // error signal for correct behaviour on CI
    process.exit(1)
  })
