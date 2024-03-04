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
  type BrowserWindowConstructorOptions
} from 'electron'
import type { WindowPosition } from './types'
import setWindowChrome from './set-window-chrome'
import attachLogger from './attach-logger'
import type LogProvider from '@providers/log'
import type ConfigProvider from '@providers/config'
import type DocumentManager from '@providers/documents'

/**
 * Creates a BrowserWindow with main window configuration and loads the main
 * renderer.
 *
 * @return  {BrowserWindow}  The loaded main window
 */
export default function createMainWindow (
  windowId: string,
  logger: LogProvider,
  config: ConfigProvider,
  docs: DocumentManager,
  conf: WindowPosition
): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    width: conf.width,
    height: conf.height,
    x: conf.x,
    y: conf.y,
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    show: false,
    webPreferences: {
      sandbox: true,
      preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY
    }
  }

  setWindowChrome(config, winConf)

  const effectiveUrl = new URL(MAIN_WINDOW_WEBPACK_ENTRY)
  // Add the print preview file to the search params
  effectiveUrl.searchParams.append('window_id', windowId)

  const window = new BrowserWindow(winConf)

  // Load the index.html of the app.
  // The variable MAIN_WINDOW_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${MAIN_WINDOW_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Implement main process logging
  attachLogger(logger, window, `Main Window (${windowId})`)

  // (Windows/Linux only) Listen to browser navigation events, and go back/
  // forward in the document manager's history accordingly. This is not
  // supported on macOS.
  window.on('app-command', (event, command) => {
    if (command === 'browser-backward') {
      // docs.back().catch(e => logger.error(e.message, e))
      window.webContents.send('shortcut', 'navigate-back')
    } else if (command === 'browser-forward') {
      // docs.forward().catch(e => logger.error(e.message, e))
      window.webContents.send('shortcut', 'navigate-forward')
    }
  })

  // This does exactly the same as the app-command listener above, but for macOS
  window.on('swipe', (event, direction) => {
    if (direction === 'left') {
      // docs.back().catch(e => logger.error(e.message, e))
      window.webContents.send('shortcut', 'navigate-back')
    } else if (direction === 'right') {
      // docs.forward().catch(e => logger.error(e.message, e))
      window.webContents.send('shortcut', 'navigate-forward')
    }
  })

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
