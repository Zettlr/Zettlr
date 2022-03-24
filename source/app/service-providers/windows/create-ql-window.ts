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
import { MDFileDescriptor } from '@dts/main/fsal'
import { WindowPosition } from './types'
import setWindowChrome from './set-window-chrome'
import preventNavigation from './prevent-navigation'
import attachLogger from './attach-logger'
import LogProvider from '@providers/log'

/**
 * Creates a BrowserWindow with Quicklook Window configuration and loads the
 * corresponding renderer.
 *
 * @param   {MDFileDescriptor}  file  The file to load in the Quicklook
 * @return  {BrowserWindow}           The loaded main window
 */
export default function createQuicklookWindow (logger: LogProvider, config: ConfigProvider, file: MDFileDescriptor, conf: WindowPosition): BrowserWindow {
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
      contextIsolation: true,
      preload: QUICKLOOK_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf)

  const window = new BrowserWindow(winConf)

  const effectiveUrl = new URL(QUICKLOOK_WEBPACK_ENTRY)
  effectiveUrl.searchParams.append('file', file.path)

  // Load the index.html of the app.
  // The variable QUICKLOOK_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${QUICKLOOK_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Prevent arbitrary navigation away from our WEBPACK_ENTRY
  preventNavigation(logger, window)

  // Implement main process logging
  attachLogger(logger, window, 'Quicklook Window')

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
      logger.error(`Could not clear session data: ${e.message as string}`, e)
    })
  })

  return window
}
