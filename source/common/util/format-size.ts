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
  const units = short
    ? [ 'B', 'KB', 'MB', 'GB' ]
    : [ 'Byte', 'Kilobyte', 'Megabyte', 'Gigabyte' ]

  if (size < 1024) {
    return `${size} ${units[0]}`
  }

  // The thresholds used to be 1024-based while the divisors are 1000-based, so
  // sizes in between rendered as a number that should have rolled over into the
  // next unit: 1,023,999 Bytes came out as "1024 KB". Stepping up whenever the
  // rounded value reaches 1000 keeps the displayed number in range whatever the
  // input is.
  let value = size / 1000
  let unit = 1

  while (unit < units.length - 1 && Math.round(value) >= 1000) {
    value /= 1000
    unit++
  }

  return `${Math.round(value)} ${units[unit]}`
}
