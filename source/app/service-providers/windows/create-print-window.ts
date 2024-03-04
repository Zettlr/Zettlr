/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createPrintWindow function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow using the print configuration.
 *
 * END HEADER
 */

import type ConfigProvider from '@providers/config'
import type LogProvider from '@providers/log'
import {
  BrowserWindow,
  type BrowserWindowConstructorOptions
} from 'electron'
import attachLogger from './attach-logger'
import setWindowChrome from './set-window-chrome'
import type { WindowPosition } from './types'

/**
 * Creates a BrowserWindow with print window configuration and loads the
 * corresponding renderer.
 *
 * @param   {string}  file  The file to load in the print preview
 * @return  {BrowserWindow}           The loaded print window
 */
export default function createPrintWindow (logger: LogProvider, config: ConfigProvider, file: string, conf: WindowPosition): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    width: conf.width,
    height: conf.height,
    x: conf.x,
    y: conf.y,
    show: false,
    webPreferences: {
      sandbox: true,
      // We are loading an iFrame with a local resource, so we must disable webSecurity for this window
      webSecurity: false,
      preload: PRINT_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf)

  const window = new BrowserWindow(winConf)

  const effectiveUrl = new URL(PRINT_WEBPACK_ENTRY)
  // Add the print preview file to the search params
  effectiveUrl.searchParams.append('file', file)

  // Load the index.html of the app.
  // The variable PRINT_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${PRINT_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Implement main process logging
  attachLogger(logger, window, 'Print Window')

  // Only show window once it is completely initialized + maximize it
  window.once('ready-to-show', function () {
    window.show()
  })

  // Emitted when the user wants to close the window.
  window.on('close', (event) => {
    let ses = window.webContents.session
    // Do not "clearCache" because that would only delete my own index files
    ses.clearStorageData({
      storages: [
        'cookies', // Nobody needs cookies except for downloading pandoc etc
        'localstorage',
        'shadercache', // Should never contain anything
        'websql'
      ]
    }).catch(e => {
      logger.error(`Could not clear session data: ${e.message as string}`, e)
    })
  })

  return window
}
