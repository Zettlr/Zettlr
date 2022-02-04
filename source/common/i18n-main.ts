/**
 * BEGIN HEADER
 *
 * Contains:        Internationalization functions
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains several functions, not classes, that help
 *                  with the internationalization of the app.
 *
 * END HEADER
 */

import sanitizeHtml from 'sanitize-html'

let config: ConfigProvider|undefined

export function provideConfigToI18NMain (provider: ConfigProvider): void {
  config = provider
}

/**
 * This translates a given identifier string into the loaded language
 * @param  {string} identifier A dot-delimited string containing the translatable
 * @param  {any} args   Zero or more strings that will replace %s-placeholders in the string
 * @return {String}        The translation with all potential replacements applied.
 */
export function trans (identifier: string, ...args: any[]): string {
  if (global.i18n === undefined) {
    // If you see this error while developing, you're doing something wrong
    // (e.g. call `trans` in one of the constructors of the service providers).
    throw new Error(`Cannot translate ${identifier}, since the translations have not yet been loaded!`)
  }

  if (!identifier.includes('.')) {
    // This happens especially if you, e.g., call the `trans` function with a
    // yet-to-translate string that does not contain dots.
    throw new Error(`The translation string was malformed: ${identifier}!`)
  }

  // Split the string by dots
  let str = identifier.split('.')
  // The function will be called from line 74 as a fallback
  // if a given string couldn't be found.
  let transString = global.i18n
  let skipFallback = false
  if (args[0] === true) {
    transString = global.i18nFallback
    skipFallback = true // Prevent an endless loop if the string is also missing from fallback
    args.splice(0, 1) // Remove the first argument as it's only the injected "true"
  }

  for (let obj of str) {
    if (obj in transString) {
      transString = transString[obj]
    } else {
      const isDebug: boolean = config?.get('debug') ?? skipFallback
      // Something went wrong and the requested translation string was
      // not found -> fall back and just return the original string
      return (isDebug) ? identifier : trans(identifier, ...[true].concat(args))
    }
  }

  // There was an additional attribute missing (there is a whole object
  // in the variable) -> just return the string
  if (typeof transString !== 'string') {
    return identifier
  }

  for (let a of args) {
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
