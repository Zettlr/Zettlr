/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Trans-function for the renderer
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This is the trans-function that is specifically made for
 *                  sandboxed renderer processes.
 *
 * END HEADER
 */

import sanitizeHtml from 'sanitize-html'
const ipcRenderer = window.ipc

/**
 * This translates a given identifier string into the loaded language
 * @param  {String} string A dot-delimited string containing the translatable
 * @param  {any} args   Zero or more strings that will replace %s-placeholders in the string
 * @return {String}        The translation with all potential replacements applied.
 */
export function trans (string: string, ...args: any[]): string {
  if (!string.includes('.')) {
    // Wtf? But alright, return the string and log an error
    console.log('The translation string was malformed: ' + string + '!')
    return string
  }

  // Make sure the translations are ready
  if (global.i18n === undefined || global.i18nFallback === undefined) {
    const { i18n, i18nFallback } = ipcRenderer.sendSync('get-translation')
    global.i18n = i18n
    global.i18nFallback = i18nFallback
  }

  // Split the string by dots
  const str = string.split('.')
  // The function will be called from line 58 as a fallback
  // if a given string couldn't be found.
  let transString = global.i18n
  let skipFallback = false
  if (args[0] === true) {
    transString = global.i18nFallback
    skipFallback = true // Prevent an endless loop if the string is also missing from fallback
    args.splice(0, 1) // Remove the first argument as it's only the injected "true"
  }

  for (const obj of str) {
    if (obj in transString) {
      transString = transString[obj]
    } else {
      // Something went wrong and the requested translation string was
      // not found -> fall back and just return the original string
      return (Boolean(window.config.get('debug')) || skipFallback) ? string : trans(string, ...[true].concat(args))
    }
  }

  // There was an additional attribute missing (there is a whole object
  // in the variable) -> just return the string
  if (typeof transString !== 'string') {
    return string
  }

  for (const a of args) {
    transString = transString.replace('%s', a) // Always replace one %s with an arg
  }

  // Finally, before returning the translation, sanitize it. As these are only
  // translation strings, we can basically only allow a VERY small subset of all
  // tags.
  const safeString = sanitizeHtml(transString, {
    allowedTags: [ 'em', 'strong', 'kbd' ]
  })

  return safeString
}
