/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Extracts valid files and folders to be opened with Zettlr
 *                  from the given argv string.
 *
 * END HEADER
 */

// Helpers to determine what files from argv we can open
const isFile = require('./is-file')
const path = require('path')
// Supported filetypes
const filetypes = require('../data.json').filetypes

/**
 * Extracts files from the argv.
 * @param {Array} [argv=process.argv] The array to search for files
 * @returns {Array} The filtered out files
 */
module.exports = function (argv = process.argv) {
  if (!argv || !Array.isArray(argv)) return []

  const filesToOpen = argv.filter(function (element) {
    // Filter out CLI arguments, non-files, and non-supported files
    return element.substring(0, 2) !== '--' &&
      isFile(element) &&
      // Include RMarkdown files here, filter them out later
      filetypes.includes(path.extname(element))
  })

  global.filesToOpen = global.filesToOpen.concat(filesToOpen)
}
