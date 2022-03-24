/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createAboutWindow function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow with an entry point according to
 *                  the function arguments.
 *
 * END HEADER
 */

import LogProvider from '@providers/log'
import {
  BrowserWindow,
  BrowserWindowConstructorOptions
} from 'electron'
import attachLogger from './attach-logger'
import preventNavigation from './prevent-navigation'
import setWindowChrome from './set-window-chrome'
import { WindowPosition } from './types'

/**
 * Creates a BrowserWindow with print window configuration and loads the
 * corresponding renderer.
 *
 * @return  {BrowserWindow}           The loaded print window
 */
export default function createAboutWindow (logger: LogProvider, config: ConfigProvider, conf: WindowPosition): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    width: conf.width,
    height: conf.height,
    x: conf.x,
    y: conf.y,
    minimizable: false, // Disable the minimise button for this utility window
    show: false,
    fullscreenable: false,
    webPreferences: {
      contextIsolation: true,
      preload: ABOUT_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  window.loadURL(ABOUT_WEBPACK_ENTRY)
    .catch(e => {
      logger.error(`Could not load URL ${ABOUT_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(logger, window)

  // Implement main process logging
  attachLogger(logger, window, 'About Window')

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
        'appcache',
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
