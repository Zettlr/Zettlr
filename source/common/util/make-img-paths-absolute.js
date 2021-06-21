/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to make image paths absolute.
 *
 * END HEADER
 */

let path = (typeof window !== 'undefined') ? window.path : import('path').then(mod => { path = mod })
const { getImageRE } = require('../regular-expressions')

/**
 * This function takes a Markdown string and replaces all occurrences of images
 * with an absolutised version.
 * @param  {String} basepath The basepath with which relative paths should be joined.
 * @param  {String} mdstring The string to be altered.
 * @return {String}          The altered mdstring value.
 */
module.exports = function (basePath, mdstring) {
  let imgRE = getImageRE(true) // We need the multiline version
  return mdstring.replace(imgRE, (match, alt, targetAndTitle, title, pandocAttrs, offset, string) => {
    // We'll make use of path for file system URIs, and the URL() constructor
    // for web links. We know that new URL() will throw a TypeError if the URL
    // is not valid, so we can distinct two cases: If URL does not throw, it's
    // a valid URL and we can simply pass that one. But if it throws, use some
    // path-magic to convert it into an absolute path.

    // There was a title-text
    let targetOnly = targetAndTitle
    if (title !== undefined) {
      targetOnly = targetOnly.replace(`"${title}"`, '').trim()
    }

    try {
      // Short explainer for "throwawayVariable": If we instantiate URL
      // without "new" it'll throw an error always. But if we simply use "new"
      // there may be side effects. So we'll stuff it into an unused variable
      // and disable that line ...
      let throwawayVariable = new URL(targetOnly) // eslint-disable-line
    } catch (e) {
      // It's not a valid URL, so pathify it! Luckily, path.resolve does all
      // the work for us.
      if (!path.isAbsolute(targetOnly)) {
        targetOnly = path.resolve(basePath, targetOnly)
      }
    }

    return `![${alt}](${targetOnly}${(title !== undefined) ? ' "' + title + '"' : ''})${(pandocAttrs !== undefined) ? pandocAttrs : ''}`
  })
}
