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

let i18nData: any

/**
 * Call this function during window registration to load the translation data
 * immediately after start so that the translations are available. NOTE: This
 * function produces a side-effect in that it sets the local module variable.
 */
export async function loadData (): Promise<void> {
  i18nData = await ipcRenderer.invoke('i18n')
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
