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

const isFile = require('./is-file')
const path = require('path')

/**
 * This function takes a Markdown string and replaces all occurrences of images
 * with an absolutised version.
 * @param  {String} basepath The basepath with which relative paths should be joined.
 * @param  {String} mdstring The string to be altered.
 * @return {String}          The altered mdstring value.
 */
module.exports = function (basePath, mdstring) {
  let imgRE = /^!\[(.*?)\]\((.+?)\)({.*})?$/gmi
  return mdstring.replace(imgRE, (match, p1, p2, p3, offset, string) => {
    // Check if the path (p2) contains the absolute path. This is assumed
    // in three cases:
    // 1. The BasePath is the beginning of the given URL
    // 2. The image path begins with either http(s) or file (i.e. protocols)
    // 3. It's an actual file.
    if (p2.indexOf(basePath) === 0 || /^(http|file)/.test(p2) || isFile(p2)) {
      // It's already absolute (either local or remote)
      // But we have to make sure a protocol is assigned for HTML exports to
      // work properly.
      try {
        let tester = new URL(p2)
        if (!tester.protocol || !/^(http|file)/.test(tester.protocol)) p2 = 'file://' + p2
      } catch (e) {
        // new URL() throws a type error if it's not a valid URL (also happens)
        // in cases of absolute file paths.
        p2 = 'file://' + p2
      }
      return `![${p1}](${p2})${(p3 != null) ? p3 : ''}`
    } else {
      // Make it absolute
      return `![${p1}](file://${path.join(basePath, p2)})${(p3 != null) ? p3 : ''}`
    }
  })
}
