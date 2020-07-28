/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Yhancik
 * License:         GNU GPL v3
 *
 * Description:     Generates Markdown file link or image
 *
 * END HEADER
 */

const path = require('path')

/**
* Generates a Markdown file link or image, making paths POSIX & relative.
* @param  {String}  filePath        Original filepath
* @param  {String}  basePath    Base path to which we want paths to be relative
* @param  {Boolean} isImg       If true, will return ![]() instead of []()
* @return {String}              The generated file link, in Markdown.
*/
module.exports = function (filePath, basePath, isImg = false) {
  let text = ''
  let pathToInsert = path.relative(basePath, filePath)

  // If the path contains parenthesis, we percent-encode them
  pathToInsert = pathToInsert.replace(/[()]/g, escape)

  // Transforms Win32 paths (backslashes) into Posix paths (fwd slashes)
  if (process.platform === 'win32') {
    pathToInsert = path.posix.join(...pathToInsert.split(path.win32.sep))
  }

  // Generates the Markdown, using the filename as caption
  text = `[${path.posix.basename(pathToInsert)}](${pathToInsert})\n`

  // Adding ! if we're making an image link
  if (isImg) text = '!' + text

  return text
}
