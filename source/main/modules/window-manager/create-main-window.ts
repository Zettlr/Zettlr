/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createMainWindow function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a new BrowserWindow instance with main window
 *                  configuration, as well as registering all hooks that have
 *                  to be called either way.
 *
 * END HEADER
 */

import {
  BrowserWindow,
  BrowserWindowConstructorOptions
} from 'electron'
import { WindowPosition } from './types.d'
import setWindowChrome from './set-window-chrome'
import preventNavigation from './prevent-navigation'
import attachLogger from './attach-logger'

/**
 * Creates a BrowserWindow with main window configuration and loads the main
 * renderer.
 *
 * @return  {BrowserWindow}  The loaded main window
 */
export default function createMainWindow (conf: WindowPosition): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    width: conf.width,
    height: conf.height,
    x: conf.left,
    y: conf.top,
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    show: false,
    webPreferences: {
      // Zettlr needs all the node features, so in preparation for Electron
      // 5.0 we'll need to explicitly request it.
      contextIsolation: false,
      nodeIntegration: true
    },
    backgroundColor: '#fff'
  }

  setWindowChrome(winConf)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  // The variable MAIN_WINDOW_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  // @ts-expect-error
  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .catch(e => {
      // @ts-expect-error
      global.log.error(`Could not load URL ${MAIN_WINDOW_WEBPACK_ENTRY as string}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(window)
  // Implement main process logging
  attachLogger(window, 'Main Window')

  // Only show window once it is completely initialized + maximize it
  window.once('ready-to-show', function () {
    window.show()
    if (conf.isMaximised) {
      window.maximize()
    }
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
