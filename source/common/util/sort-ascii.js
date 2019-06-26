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
  // Negative return: a is smaller b (case insensitive)
  if (a.name.toLowerCase() < b.name.toLowerCase()) {
    return -1
  } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
    return 1
  } else {
    return 0
  }
}
