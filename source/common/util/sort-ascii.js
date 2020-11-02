/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort Files by name.
 *
 * END HEADER
 */

/**
 * Helper function to sort files by ascii characters
 * @param  {ZettlrFile} a A ZettlrFile exposing a name property
 * @param  {ZettlrFile} b A ZettlrFile exposing a name property
 * @return {number}   0, 1, or -1, depending upon what the comparision yields.
 */
module.exports = function (a, b) {
  let aSort = a.name.toLowerCase()
  let bSort = b.name.toLowerCase()

  // Check for firstHeadings, if applicable
  if (global.config.get('display.useFirstHeadings')) {
    if (a.firstHeading != null) aSort = a.firstHeading.toLowerCase()
    if (b.firstHeading != null) bSort = b.firstHeading.toLowerCase()
  }

  // Second, check for frontmatter, as this overwrites
  if (a.frontmatter != null && a.frontmatter.hasOwnProperty('title')) aSort = a.frontmatter.title.toLowerCase()
  if (b.frontmatter != null && b.frontmatter.hasOwnProperty('title')) bSort = b.frontmatter.title.toLowerCase()

  // Negative return: a is smaller b (case insensitive)
  if (aSort < bSort) {
    return -1
  } else if (aSort > bSort) {
    return 1
  }

  return 0
}
