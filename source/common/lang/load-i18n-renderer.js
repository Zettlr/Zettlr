/**
 * BEGIN HEADER
 *
 * Contains:        Internationalization functions
 * CVM-Role:        <none>
 * Maintainer:      Kévin Bernard-Allies
 * License:         GNU GPL v3
 *
 * Description:     This file contains i18n loader function used by every
 *                  renderer processes.
 *
 * END HEADER
 */

const { remote } = require('electron')

/**
 * Load i18n data from main process into global variables "i18n" and
 * "i18nFallback"
 *
 * NOTE: we use raw string for transferring data, because transferring a
 * javascript object is incredibly slow: getGlobal() return a proxy object and
 * each access execute an IPC FOR EACH ATTRIBUTE being read)
 */
module.exports = function loadI18n () {
  global.i18n = JSON.parse(remote.getGlobal('i18nRawData'))
  global.i18nFallback = JSON.parse(remote.getGlobal('i18nFallbackRawData'))
}
