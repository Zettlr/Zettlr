/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        ZettlrPrint class
  * CVM-Role:        Controller
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     A wrapper around the BrowserWindows used for printing.
  *
  * END HEADER
  */

const path = require('path')
const { BrowserWindow } = require('electron')

class ZettlrPrint {
  /**
   * Initates the print Window reference array.
   */
  constructor () {
    this._win = null
    this._darkMode = global.config.get('darkTheme')

    // Enable listening to config changes
    global.config.on('update', (e) => {
      if (!this._win) return // There's no window to alter
      if (global.config.get('darkTheme') !== this._darkMode) {
        this._darkMode = global.config.get('darkTheme')
        this._win.webContents.send('toggle-theme')
      }
    })
  }

  /**
   * Opens a printing window with a specific file
   * @param  {string} file The file to be opened
   * @return {void}      No return.
   */
  openPrint (file) {
    if (this._win) return this._win.focus() // Only one print window

    let winConf = {
      acceptFirstMouse: true,
      minWidth: 300,
      minHeight: 200,
      show: false,
      webPreferences: {
        // Zettlr needs all the node features, so in preparation for Electron
        // 5.0 we'll need to explicitly request it.
        nodeIntegration: true,
        additionalArguments: [file.toString()],
        // We are loading an iFrame with a local resource, so we must disable webSecurity for this window
        webSecurity: false
      },
      backgroundColor: '#fff',
      frame: false, // No frame for quicklook windows. Mainly prevents the menu bar to be shown on win+linux
      scrollBounce: true, // The nice scrolling effect for macOS
      defaultEncoding: 'utf8' // Why the hell does this default to ISO?
    }

    const shouldUseNativeAppearance = global.config.get('window.nativeAppearance')

    // If the user wants to use native appearance, this means to use a frameless
    // window with the traffic lights slightly inset.
    if (process.platform === 'darwin' && shouldUseNativeAppearance) {
      winConf.titleBarStyle = 'hiddenInset'
    } else if (process.platform === 'darwin' && !shouldUseNativeAppearance) {
      // Now we're simply creating a frameless window without everything.
      winConf.frame = false
    }

    // If the user wants to use non-native appearance on non-macOS platforms,
    // this means we need a frameless window (so that the renderer instead can
    // display the menu and window controls).
    if (process.platform !== 'darwin' && !shouldUseNativeAppearance) {
      winConf.frame = false
    }

    // Application icon for Linux. Cannot not be embedded in the executable.
    if (process.platform === 'linux') {
      winConf.icon = path.join(__dirname, 'assets/icons/128x128.png')
    }

    // First create a new browserWindow
    let win = new BrowserWindow(winConf)

    // Then activate listeners.
    // and load the index.html of the app.
    // eslint-disable-next-line no-undef
    win.loadURL(PRINT_WEBPACK_ENTRY)

    // Only show window once it is completely initialized
    win.once('ready-to-show', () => { win.show() })
    // As soon as the window is closed, reset it to null.
    win.on('closed', () => { this._win = null })

    this._win = win
  }
}

module.exports = ZettlrPrint
