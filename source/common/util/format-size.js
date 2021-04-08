/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Formats a size (in bytes) into a human-readable string.
 *
 * END HEADER
 */

/**
 * Takes a size in bytes, and returns a human-readable string in Byte, Kilobyte,
 * Megabyte, or Gigabyte.
 *
 * @param   {number}  size  The size in bytes.
 *
 * @return  {string}        The formatted size.
 */
module.exports = function formatSize (size) {
  if (size < 1024) {
    return `${size} Byte`
  } else if (size < 1024 * 1000) {
    return `${Math.round(size / 1000)} Kilobyte`
  } else if (size < 1024 * 1000 * 1000) {
    return `${Math.round(size / (1000 * 1000))} Megabyte`
  } else {
    return `${Math.round(size / (1000 * 1000 * 1000))} Gigabyte`
  }
}
