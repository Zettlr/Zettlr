/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to sort files by date.
 *
 * END HEADER
 */

/**
 * Helper function to sort files by modification or creation time
 * @param  {ZettlrFile} a A ZettlrFile exposing a modtime property
 * @param  {ZettlrFile} b A ZettlrFile exposing a modtime property
 * @return {number}   0, 1, or -1, depending upon what the comparision yields.
 */
module.exports = function (a, b) {
  let prop = (global.config.get('sortingTime') === 'modtime') ? 'modtime' : 'creationtime'
  if (a[prop] < b[prop]) {
    return -1
  } else if (a[prop] > b[prop]) {
    return 1
  } else {
    return 0
  }
}
