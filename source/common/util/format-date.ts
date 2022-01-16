/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to format dates
 *
 * END HEADER
 */

import { DateTime } from 'luxon'
import { trans } from '../i18n-renderer'

/**
 * Formats a date based on the user's locale.
 *
 * @param   {Date|number}      dateObj   A JavaScript Date object or a timestamp in milliseconds
 * @param   {boolean}  [relative=false]  Optional. If true, output a relative timestamp
 *
 * @return  {string}                     The formatted date string
 */
export default function formatDate (dateObj: Date|number, relative: boolean = false): string {
  // NOTE: This function does not work during any tests, as Node.js needs Intl
  // locales which it does not provide by default. For Electron, this works fine.
  const isDate = dateObj instanceof Date
  const dt = (isDate) ? DateTime.fromJSDate(dateObj) : DateTime.fromMillis(dateObj)
  if (relative) {
    // Check if there is at least a minute difference between the datetime object
    // and now. If not, simply output "just now", else the actual relative difference.
    if (dt.diff(DateTime.now(), 'minutes').toObject().minutes as number * -1 < 1) {
      return trans('gui.date_just_now_label')
    } else {
      return dt.toRelative({
        style: 'short', // Can be short, narrow, or long
        locale: global.config.get('appLang')
      }) ?? ''
    }
  } else {
    return dt.toLocaleString(
      { dateStyle: 'long', timeStyle: 'short' },
      { locale: global.config.get('appLang') }
    )
  }
}
