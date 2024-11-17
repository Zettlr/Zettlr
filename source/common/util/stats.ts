/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Utility functions for the writing statistics
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a set of small utility functions for
 *                  the writing statistics
 *
 * END HEADER
 */

/**
 * Returns today's date as an ISO string (YYYY-MM-DD)
 *
 * @return  {string}  Today's date in international standard form.
 */
export function today (): string {
  const d = new Date()
  const yyyy = d.getFullYear()
  const mm = (d.getMonth() + 1).toString().padStart(2, '0')
  const dd = d.getDate().toString().padStart(2, '0')

  return `${yyyy}-${mm}-${dd}`
}

/**
 * Takes any record of strings to numbers where strings MUST conform to the
 * format YYYY-MM-DD, and returns the VALUES of the up to 30 most recent entries
 * sorted with most recent date first.
 *
 * @param   {Record<string, number>}   record  The record
 *
 * @return  {Array<[string, number]>}          The up to last 30 values
 */
export function last30EntriesByDate (record: Record<string, number>): Array<[string, number]> {
  return Object.entries(record)
    // Sort by date (ascending; earlier first)
    .sort((a, b) => a[0].localeCompare(b[0], 'en'))
    // Reverse (latest dates first)
    .reverse()
    // Take 30
    .slice(0, 30)
}

/**
 * Returns the total sum of the up to 30 last values for the provided record.
 *
 * @param   {Record<string, number>}  record  The record
 *
 * @return  {number}                          The sum
 */
export function sumAny30Days (record: Record<string, number>): number {
  return last30EntriesByDate(record).map(x => x[1]).reduce((prev, cur) => prev + cur, 0)
}

/**
 * Returns the average of the up to 30 last values for the provided record.
 *
 * @param   {Record<string, number>}  record  The record
 *
 * @return  {number}                          The average
 */
export function avgAny30Days (record: Record<string, number>): number {
  if (last30EntriesByDate(record).length === 0) {
    return 0
  }

  return sumAny30Days(record) / last30EntriesByDate(record).length
}
