/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createUpdateWindow function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow with an entry point according to
 *                  the function arguments.
 *
 * END HEADER
 */

import {
  BrowserWindow,
  BrowserWindowConstructorOptions
} from 'electron'
import attachLogger from './attach-logger'
import preventNavigation from './prevent-navigation'
import setWindowChrome from './set-window-chrome'
import { WindowPosition } from './types'

/**
 * Creates a BrowserWindow with update window functionality
 *
 * @return  {BrowserWindow}           The loaded update window
 */
export default function createUpdateWindow (conf: WindowPosition): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    width: conf.width,
    height: conf.height,
    minimizable: false, // Disable the minimise button for this utility window
    x: conf.left,
    y: conf.top,
    show: false,
    fullscreenable: false,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    }
  }

  // Set the correct window chrome
  setWindowChrome(winConf)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  // @ts-expect-error
  window.loadURL(UPDATE_WEBPACK_ENTRY)
    .catch(e => {
      // @ts-expect-error
      global.log.error(`Could not load URL ${UPDATE_WEBPACK_ENTRY as string}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(window)

  // Implement main process logging
  attachLogger(window, 'Update Window')

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
      global.log.error(`Could not clear session data: ${e.message as string}`, e)
    })
  })

  return window
}
