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

import { promises as fs } from 'fs'
import sanitizeHtml from 'sanitize-html'
import { LangFileMetadata } from './util/enum-lang-files'
import { Candidate } from './util/find-lang-candidates'
import getLanguageFile from './util/get-language-file'

/**
 * This function loads a language JSON file specified by lang into the global
 * i18n-object.
 *
 * @param  {String} [lang='en-US'] The language to be loaded
 * @return {Object}                The language metadata object.
 */
export async function loadI18n (lang = 'en-US'): Promise<Candidate & LangFileMetadata> {
  let file = getLanguageFile(lang) // Will return a working path

  // Cannot do this asynchronously, because it HAS to be loaded directly
  // after the config and written into the global object
  global.i18nRawData = await fs.readFile(file.path, 'utf8')
  global.i18n = JSON.parse(global.i18nRawData)

  // Also load the en-US fallback as we can be sure this WILL both stay
  // up to date and will be understood by most people.
  const fallback = getLanguageFile('en-US') // Will return either the shipped or updated file
  global.i18nFallbackRawData = await fs.readFile(fallback.path, 'utf8')
  global.i18nFallback = JSON.parse(global.i18nFallbackRawData)

  return file
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
    global.log.error(`Cannot translate ${identifier}, since the translations have not yet been loaded!`)
    return identifier
  }
  if (!identifier.includes('.')) {
    // This happens especially if you, e.g., call the `trans` function with a
    // yet-to-translate string that does not contain dots. In these cases we
    // log a warning and return the identifier (which might even be a normal
    // string).
    global.log.warning(`The translation string was malformed: ${identifier}!`)
    return identifier
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
      // Something went wrong and the requested translation string was
      // not found -> fall back and just return the original string
      return (Boolean(global.config.get('debug')) || skipFallback) ? identifier : trans(identifier, ...[true].concat(args))
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
