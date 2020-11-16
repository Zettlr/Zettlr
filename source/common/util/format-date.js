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

/**
* Format a date.
* @param  {Date} dateObj Object of type date.
* @return {String}       Returns the localized, human-readable date as a string
*/
module.exports = function (dateObj) {
  // TODO: Enable settings for these
  const options = {
    dateStyle: 'long', // full|long|medium|short
    timeStyle: 'short', // full|long|medium|short
    fractionalSecondDigits: 0
  }

  // NOTE: This does not work during any tests, as Node.js needs Intl locales
  // which it does not provide by default. For Electron, this works fine.
  return new Intl.DateTimeFormat(global.config.get('appLang'), options).format(dateObj)
}
