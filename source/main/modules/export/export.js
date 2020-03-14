/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrExport
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The exporter module for Zettlr.
 *
 * END HEADER
 */

// Pre-Pandoc modules
const prepareFile = require('./prepare-file')
const prepareDefault = require('./prepare-default-export')
const preparePDF = require('./prepare-pdf-export')

// Post-Pandoc modules
const makeRevealBundle = require('./make-reveal-bundle')
const makeTextbundle = require('./make-textbundle')
const showdown = require('./showdown-export')
const runPandoc = require('./run-pandoc')

// General includes
const commandExists = require('command-exists')
const path = require('path')
const { shell } = require('electron')

/**
 * These formats are the ones accepted by the Pandoc writer, so we'll do
 * a quick check as to whether or not the passed format is allowed.
 */
const ALLOWED_FORMATS = [
  // Default export options (accepted by Pandoc)
  'asciidoc', 'beamer', 'context', 'docbook5', 'docx', 'docuwiki', 'epub',
  'fb2', 'haddock', 'icml', 'ipynb', 'jats', 'jira', 'json', 'latex', 'man',
  'mediawiki', 'ms', 'muse', 'native', 'odt', 'opml', 'opendocument', 'org',
  'plain', 'pptx', 'rst', 'rtf', 'texinfo', 'textile', 'slideous', 'slidy',
  'dzslides', 's5', 'tei', 'xwiki', 'zimwiki',
  // Zettlr-specific export options that need special care
  'html', 'textbundle', 'textpack', 'pdf',
  // revealJS with theme options
  'revealjs-black', 'revealjs-moon', 'revealjs-league', 'revealjs-sky',
  'revealjs-beige', 'revealjs-solarized', 'revealjs-serif', 'revealjs-white'
]

/**
 * Returns a Promise that resolves or rejects depending on the outcome of the export.
 * @param  {Object} options An options object compatible to ZettlrExport.
 * @return {Promise}         A promise
 */
module.exports = async function (options) {
  // Check if the format is not invalid
  if (!ALLOWED_FORMATS.includes(options.format.toLowerCase())) {
    throw new Error('Unknown format: ' + options.format)
  }

  // Determine the availability of Pandoc
  let hasPandoc = true
  try {
    await commandExists('pandoc')
  } catch (err) {
    hasPandoc = false
  }

  // A small preparation step in case we have a revealjs
  // export to keep the switch below lean
  if (/^revealjs/.test(options.format)) {
    options.revealJSStyle = options.format.substr(9)
    options.format = options.format.substr(0, 8)
  }

  // Make sure the PDF key is set, even if we don't use it
  if (!options.hasOwnProperty('pdf')) options.pdf = {}
  if (!options.pdf.hasOwnProperty('toc')) options.pdf.toc = false
  if (!options.pdf.hasOwnProperty('tocDepth')) options.pdf.tocDepth = 0
  if (!options.pdf.hasOwnProperty('titlepage')) options.pdf.titlepage = false

  // We already know where the exported file will end up, so set the property
  let filename = path.basename(options.file.path, path.extname(options.file.path))
  filename += '.' + options.format
  options.targetFile = path.join(options.dest, filename)

  // Now, prepare the input file
  // SETS PROPERTY: sourceFile
  await prepareFile(options)

  switch (options.format) {
    case 'textbundle':
    case 'textpack':
      await makeTextbundle(options)
      break
    case 'html':
      if (hasPandoc) {
        await prepareDefault(options)
      } else {
        await showdown(options)
      }
      break
    case 'pdf':
      await preparePDF(options)
      break
    default:
      await prepareDefault(options)
      break
  }

  // If applicable, run Pandoc.
  if (![ 'textbundle', 'textpack', 'html' ].includes(options.format) ||
      (options.format === 'html' && hasPandoc)) {
    await runPandoc(options)
  }

  // revealJS needs no *pre*paration, but postparation, if that is even
  // a word. This is because Pandoc can't handle inline JavaScript.
  if (options.format === 'revealjs') await makeRevealBundle(options)

  // The user may pass an optional autoOpen property. If not present or set to
  // true, the file will be opened automatically. If present and set to false,
  // it'll do nothing.
  if (!options.hasOwnProperty('autoOpen') || options.autoOpen) {
    // In case of a textbundle/pack it's a folder, else it's a file
    if ([ 'textbundle', 'textpack' ].includes(options.format)) {
      shell.showItemInFolder(options.targetFile)
    } else {
      shell.openItem(options.targetFile)
    }
  }

  return options.targetFile // Return the target file for the caller
}
