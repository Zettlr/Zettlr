/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        prepareFile
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Prepares a Markdown file for export
 *
 * END HEADER
 */

const fs = require('fs').promises
const path = require('path')

module.exports = async function (options) {
  // Prepare the sourceFile path
  options.sourceFile = path.join(options.dest, 'export.tmp')
  // Then load the file. For revealJS and HTML we do not want absolute paths.
  // let absolutePaths = (![ 'revealjs', 'html' ].includes(options.format.toLowerCase()))

  // Allow overriding via explicitly set property on the options.
  // if (options.hasOwnProperty('absoluteImagePaths')) absolutePaths = options.absoluteImagePaths
  // let cnt = options.file.read({ 'absoluteImagePaths': absolutePaths })
  let cnt = options.file.content

  // Second strip tags if necessary
  if (options.stripTags) cnt = cnt.replace(/(?<= |\n|^)#(#?[A-Z0-9-_]+#?)/gi, '')

  // Remove or unlink links.
  let ls = global.config.get('zkn.linkStart').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  let le = global.config.get('zkn.linkEnd').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

  if (options.stripLinks === 'full') {
    // Important: Non-greedy modifier needed to not strip out the whole text!
    cnt = cnt.replace(new RegExp(ls + '.+?' + le, 'g'), '')
  } else if (options.stripLinks === 'unlink') {
    // Only remove the link identifiers, not the content (note the capturing
    // group that's missing from above's replacement)
    cnt = cnt.replace(new RegExp(ls + '(.+?)' + le, 'g'), function (match, p1, offset, string) {
      return p1
    })
  }

  // Check if we should strip the IDs. We have to do IDs afterwards because
  // of the "at least 1"-modifier (+) in the link-unlink-regexes.
  if (options.stripIDs) cnt = cnt.replace(new RegExp(global.config.get('zkn.idRE'), 'g'), '')

  // Finally, save as temporary file.
  await fs.writeFile(options.sourceFile, cnt, 'utf8')
}
