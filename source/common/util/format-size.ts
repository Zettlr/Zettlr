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
 * @param   {number}  size          The size in bytes.
 * @param   {boolean} [short=false] Whether to use short labels or long ones.
 *
 * @return  {string}                The formatted size.
 */
export default function formatSize (size: number, short: boolean = false): string {
  if (size < 1024) {
    return `${size} ` + (short ? 'B' : 'Byte')
  } else if (size < 1024 * 1000) {
    return `${Math.round(size / 1000)} ` + (short ? 'KB' : 'Kilobyte')
  } else if (size < 1024 * 1000 * 1000) {
    return `${Math.round(size / (1000 * 1000))} ` + (short ? 'MB' : 'Megabyte')
  } else {
    return `${Math.round(size / (1000 * 1000 * 1000))} ` + (short ? 'GB' : 'Gigabyte')
  }
}
