/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createQuicklookWindow function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow using the Quicklook configuration
 *
 * END HEADER
 */

import {
  BrowserWindow,
  BrowserWindowConstructorOptions
} from 'electron'
import { MDFileDescriptor } from '../fsal/types'
import { WindowPosition } from './types'
import setWindowChrome from './set-window-chrome'
import preventNavigation from './prevent-navigation'
import attachLogger from './attach-logger'

/**
 * Creates a BrowserWindow with Quicklook Window configuration and loads the
 * corresponding renderer.
 *
 * @param   {MDFileDescriptor}  file  The file to load in the Quicklook
 * @return  {BrowserWindow}           The loaded main window
 */
export default function createQuicklookWindow (file: MDFileDescriptor, conf: WindowPosition): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    width: conf.width,
    height: conf.height,
    x: conf.left,
    y: conf.top,
    minWidth: 300,
    minHeight: 200,
    show: false,
    webPreferences: {
      contextIsolation: false,
      nodeIntegration: true,
      additionalArguments: [file.hash.toString()]
    },
    backgroundColor: '#fff'
  }

  // Set the correct window chrome
  setWindowChrome(winConf)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  // The variable QUICKLOOK_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  // @ts-expect-error
  window.loadURL(QUICKLOOK_WEBPACK_ENTRY)
    .catch(e => {
      // @ts-expect-error
      global.log.error(`Could not load URL ${QUICKLOOK_WEBPACK_ENTRY as string}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(window)

  // Implement main process logging
  attachLogger(window, 'Quicklook Window')

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
