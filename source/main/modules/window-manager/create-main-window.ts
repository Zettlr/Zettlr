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
  BrowserWindowConstructorOptions,
  screen
} from 'electron'
import setWindowChrome from './set-window-chrome'

/**
 * Creates a BrowserWindow with main window configuration and loads the main
 * renderer.
 *
 * @return  {BrowserWindow}  The loaded main window
 */
export default function createMainWindow (): BrowserWindow {
  const window = new BrowserWindow(getWindowConfig())

  // Load the index.html of the app.
  // The variable MAIN_WINDOW_WEBPACK_ENTRY is automatically resolved by electron forge / webpack
  // @ts-expect-error
  window.loadURL(MAIN_WINDOW_WEBPACK_ENTRY)
    .catch(e => {
      // @ts-expect-error
      global.log.error(`Could not load URL ${MAIN_WINDOW_WEBPACK_ENTRY as string}: ${e.message as string}`, e)
    })

  // EVENT LISTENERS

  // Only show window once it is completely initialized + maximize it
  window.once('ready-to-show', function () {
    window.show()
    if (global.config.get('window.max') as boolean) {
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

  // Now resizing events to save the last positions to config
  window.on('maximize', () => { global.config.set('window.max', true) })
  window.on('unmaximize', () => { global.config.set('window.max', false) })
  window.on('resize', onWindowResize(window))
  window.on('move', onWindowResize(window))

  return window
}

function onWindowResize (window: BrowserWindow): Function {
  return function () {
    let newBounds = window.getBounds()
    global.config.set('window.x', newBounds.x)
    global.config.set('window.y', newBounds.y)
    global.config.set('window.width', newBounds.width)
    global.config.set('window.height', newBounds.height)
    // On macOS there's no "unmaximize", therefore we have to check manually.
    let s = screen.getPrimaryDisplay().workArea
    if (newBounds.width < s.width || newBounds.height < s.height || newBounds.x > s.x || newBounds.y > s.y) {
      global.config.set('window.max', false)
    } else {
      global.config.set('window.max', true)
    }
  }
}

function getWindowConfig (): BrowserWindowConstructorOptions {
  // Prepare saved attributes from the config.
  let winWidth = global.config.get('window.width')
  let winHeight = global.config.get('window.height')
  let winX = global.config.get('window.x')
  let winY = global.config.get('window.y')
  let winMax = global.config.get('window.max')

  // Sanity checks
  let screensize = screen.getPrimaryDisplay().workAreaSize
  if (typeof winWidth !== 'number' || winWidth > screensize.width) winWidth = screensize.width
  if (typeof winHeight !== 'number' || winHeight > screensize.height) winHeight = screensize.height
  if (typeof winX !== 'number' || winX > screensize.width) winX = 0
  if (typeof winY !== 'number' || winY > screensize.height) winY = 0
  if (typeof winMax !== 'boolean') winMax = true

  const winConf: BrowserWindowConstructorOptions = {
    width: winWidth,
    height: winHeight,
    x: winX,
    y: winY,
    acceptFirstMouse: true,
    minWidth: 176,
    minHeight: 144,
    show: false,
    webPreferences: {
      // Zettlr needs all the node features, so in preparation for Electron
      // 5.0 we'll need to explicitly request it.
      nodeIntegration: true,
      enableRemoteModule: false
    },
    backgroundColor: '#fff'
  }

  setWindowChrome(winConf)

  return winConf
}
