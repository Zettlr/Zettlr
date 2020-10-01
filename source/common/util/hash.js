/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to hash strings.
 *
 * END HEADER
 */

/**
* Basic hashing function (thanks to https://stackoverflow.com/a/7616484)
* @param  {String} string The string that should be hashed
* @return {Number}        The hash of the given string
*/
module.exports = function (string) {
  let hash = 0
  let i, chr

  if (string.length === 0) return hash

  for (i = 0; i < string.length; i++) {
    chr = string.charCodeAt(i)
    hash = ((hash << 5) - hash) + chr
    hash |= 0 // Convert to 64bit integer
  }
  return hash
}
