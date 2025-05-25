/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createLogWindow function
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
 * Creates a BrowserWindow with log window configuration and loads the
 * corresponding renderer.
 *
 * @param   {WindowPosition}  conf  The configuration to load
 * @return  {BrowserWindow}         The loaded log window
 */
export default function createLogWindow (logger: LogProvider, config: ConfigProvider, conf: WindowPosition): BrowserWindow {
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
      preload: LOG_VIEWER_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  // The variable LOG_VIEWER_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  window.loadURL(LOG_VIEWER_WEBPACK_ENTRY)
    .catch(e => {
      logger.error(`Could not load URL ${LOG_VIEWER_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Implement main process logging
  attachLogger(logger, window, 'Log Window')

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
