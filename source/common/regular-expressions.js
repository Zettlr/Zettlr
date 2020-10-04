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
  /**
   * Returns a regular expression that can detect Markdown images globally
   *
   * @param   {Boolean}  multiline  Whether or not the regular expression should be multiline
   *
   * @return  {RegExp}           The wanted regular expression.
   */
  'getImageRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /(?<=\s|^)!\[(.*?)\]\((.+?(?:(?<= )"(.+)")?)\)({[^{]+})?/.source,
      // Necessary flags + optional multiline flag
      'g' + flag)
  },
  /**
   * Returns a regular expression that matches image file names
   *
   * @param   {Boolean}  multiline  Whether the expression should match multilines
   *
   * @return  {RegExp}             The compiled expression
   */
  'getImageFileRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /(\.jpg|\.jpeg|\.png|\.gif|\.svg|\.tiff|\.tif)$/.source,
      // Necessary flags + optional multiline flag
      'i' + flag
    )
  },
  /**
   * Returns a regular expression that matches URL protocols (e.g. http://)
   *
   * @param   {Boolean}  multiline  Whether or not the expression should be multiline
   *
   * @return  {RegExp}           The wanted regular expression
   */
  'getProtocolRE': function (multiline = false) {
    let flag = (multiline) ? 'm' : ''
    return RegExp(
      /^([a-z]{1,10}):\/\//,
      'i' + flag
    )
  }
}
