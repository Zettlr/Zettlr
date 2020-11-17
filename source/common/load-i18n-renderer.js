/**
 * BEGIN HEADER
 *
 * Contains:        Internationalization functions
 * CVM-Role:        <none>
 * Maintainer:      Kévin Bernard-Allies / Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains i18n loader function used by every
 *                  renderer processes.
 *
 * END HEADER
 */

const { ipcRenderer } = require('electron')

/**
 * Load i18n data from main process into global variables "i18n" and
 * "i18nFallback". The corresponding main listener is defined in the
 * Translation Provider
 */
module.exports = function loadI18n () {
  const { i18n, i18nFallback } = ipcRenderer.sendSync('get-translation')
  global.i18n = i18n
  global.i18nFallback = i18nFallback
}
