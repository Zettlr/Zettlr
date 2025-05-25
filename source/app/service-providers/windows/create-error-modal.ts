/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createPasteImageModal function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Creates a BrowserWindow with an entry point according to
 *                  the function arguments.
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

/**
 * Creates a BrowserWindow with print window configuration and loads the
 * corresponding renderer.
 *
 * @return  {BrowserWindow}           The loaded print window
 */
export default function createErrorModal (logger: LogProvider, config: ConfigProvider, win: BrowserWindow, title: string, message: string, contents?: string): BrowserWindow {
  if (contents === undefined) {
    contents = '<no-contents>'
  }

  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    width: 640,
    height: 480,
    modal: true,
    parent: win,
    show: false,
    fullscreenable: false,
    webPreferences: {
      sandbox: true,
      additionalArguments: [ title, message, contents ],
      preload: ERROR_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf, true)

  const window = new BrowserWindow(winConf)

  const effectiveUrl = new URL(ERROR_WEBPACK_ENTRY)
  // Add the error message contents to the searchParams
  effectiveUrl.searchParams.append('title', title)
  effectiveUrl.searchParams.append('message', message)
  effectiveUrl.searchParams.append('contents', contents)

  // Load the index.html of the app.
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${ERROR_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Implement main process logging
  attachLogger(logger, window, 'Error Modal')

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
