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

const moment = require('moment')

/**
* Format a date.
* @param  {Date} dateObj Object of type date.
* @return {String}       Returns the localized, human-readable date as a string
*/
module.exports = function (dateObj) {
  let date = moment(dateObj)
  // Set the current locale of the application, with fallback to en-GB.
  // Why en-GB in this specific case? Because nobody understands the imperial
  // system, and at least the British have gotten that right.
  date.locale('en-GB')
  date.locale(global.config.get('appLang'))

  return date.format('LLL')
}
