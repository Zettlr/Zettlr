/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        createProjectPropertiesWindow function
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
import type { WindowPosition } from './types'

/**
 * Creates a BrowserWindow with project properties configuration
 *
 * @param   {WindowPosition}  conf     The configuration to use
 * @param   {string}          dirPath  The directory whose project properties to load
 *
 * @return  {BrowserWindow}            The loaded print window
 */
export default function createProjectPropertiesWindow (logger: LogProvider, config: ConfigProvider, conf: WindowPosition, dirPath: string): BrowserWindow {
  const winConf: BrowserWindowConstructorOptions = {
    acceptFirstMouse: true,
    minWidth: 300,
    minHeight: 200,
    width: conf.width,
    height: conf.height,
    minimizable: false, // Disable the minimise button for this utility window
    x: conf.x,
    y: conf.y,
    show: false,
    fullscreenable: false,
    webPreferences: {
      sandbox: true,
      preload: PROJECT_PROPERTIES_PRELOAD_WEBPACK_ENTRY
    }
  }

  // Set the correct window chrome
  setWindowChrome(config, winConf)

  const window = new BrowserWindow(winConf)

  const effectiveUrl = new URL(PROJECT_PROPERTIES_WEBPACK_ENTRY)
  // Add the directory path to the search params
  effectiveUrl.searchParams.append('directory', dirPath)

  // Load the index.html of the app.
  window.loadURL(effectiveUrl.toString())
    .catch(e => {
      logger.error(`Could not load URL ${PROJECT_PROPERTIES_WEBPACK_ENTRY}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Implement main process logging
  attachLogger(logger, window, 'Project Properties')

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
