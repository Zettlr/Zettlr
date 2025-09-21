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
import { po, type GetTextTranslations } from 'gettext-parser'
import getLanguageFile from './util/get-language-file'
import { promises as fs } from 'fs'
import { ipcMain } from 'electron'
import { type Candidate } from './util/find-lang-candidates'
import { type LangFileMetadata } from './util/enum-lang-files'

let i18nData: GetTextTranslations|undefined
let handlerAttached = false

/**
 * Call this function during boot to load the translation data immediately after
 * start so that the translations are available. NOTE: This function produces a
 * side-effect in that it sets the local module variable i18nData
 */
export async function loadData (lang: string): Promise<Candidate & LangFileMetadata> {
  const file = getLanguageFile(lang)
  const contents = await fs.readFile(file.path, 'utf-8')
  i18nData = po.parse(contents)

  // Also make the data available to renderers who request the i18n data
  if (!handlerAttached) {
    ipcMain.handle('i18n', (event) => { return i18nData })
    handlerAttached = true
  }

  // We need to return the actually loaded file so that the config provider
  // knows what the app is showing.
  return file
}

/**
 * Takes a message ID and returns the appropriate translated message string. If
 * there is no language data loaded, this function returns the message ID.
 *
 * @param   {string}  msgid  The message ID to return a translation for
 *
 * @return  {string}         The translation, or the message ID if no translations were found.
 */
function getTranslation (msgid: string): string {
  if (i18nData === undefined) {
    return msgid
  }

  const context = i18nData.translations['']

  if (msgid in context && context[msgid].msgstr[0] !== '') {
    return context[msgid].msgstr[0]
  } else {
    return msgid
  }
}

/**
 * Translates the given message ID
 *
 * @param   {string}  msgid  The message ID to translate
 * @param   {any[]}   args   Provide optional arguments to replace in the
 *                           translation. One argument replaces one %s, in order.
 *
 * @return  {string}         The translated and replaced string.
 */
export function trans (msgid: string, ...args: any[]): string {
  let transString = getTranslation(msgid)

  for (const a of args) {
    transString = transString.replace('%s', String(a)) // Always replace one %s with an arg
  }

  // Finally, before returning the translation, sanitize it. As these are only
  // translation strings, we can basically only allow a VERY small subset of all
  // tags.
  const safeString = sanitizeHtml(transString, {
    allowedTags: [ 'em', 'strong', 'kbd' ]
  })

  return safeString
}
