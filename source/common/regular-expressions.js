/**
 * BEGIN HEADER
 *
 * Contains:        Utility class
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains functionality to generate regular
 *                  expressions to be used across the application for
 *                  consistent behaviour.
 *
 * END HEADER
 */

module.exports = {
  'getImageRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /(?<=\s|^)!\[(.*?)\]\((.+?(?:(?<= )"(.+)")?)\)({[^{]+})?/.source,
      // Necessary flags + optional multiline flag
      'g' + flag)
  }
}
