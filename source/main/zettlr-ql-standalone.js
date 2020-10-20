/**
  * @ignore
  * BEGIN HEADER
  *
  * Contains:        ZettlrQLStandalone class
  * CVM-Role:        Controller
  * Maintainer:      Hendrik Erz
  * License:         GNU GPL v3
  *
  * Description:     A wrapper around the BrowserWindows used for standalone
  *                  Quicklooks.
  *
  * END HEADER
  */

const path = require('path')
const { BrowserWindow } = require('electron')

class ZettlrQLStandalone {
  /**
   * Initates the Quicklook Window reference array.
   */
  constructor () {
    this._ql = []
    this._darkMode = global.config.get('darkTheme')

    // Enable listening to config changes
    global.config.on('update', (e) => {
      // Finally, send the full config object
      for (let ql of this._ql) {
        if (ql) ql.webContents.send('config-update', global.config.get())
      }
    })

    global.css.on('update', (cssPath) => {
      for (let ql of this._ql) {
        if (ql) ql.webContents.send('custom-css', cssPath)
      }
    })
  }

  /**
   * Opens a Quicklook window with a specific file
   * @param  {ZettlrFile} file The file to be opened
   * @return {void}      No return.
   */
  openQuicklook (file) {
    let winConf = {
      acceptFirstMouse: true,
      minWidth: 300,
      minHeight: 200,
      show: false,
      webPreferences: {
        // Zettlr needs all the node features, so in preparation for Electron
        // 5.0 we'll need to explicitly request it.
        nodeIntegration: true,
        additionalArguments: [file.hash.toString()]
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
    win.loadURL(QUICKLOOK_WEBPACK_ENTRY)
    // Only show window once it is completely initialized
    win.once('ready-to-show', () => { win.show() })
    // As soon as the window is closed, remove it from our array.
    win.on('closed', () => { this.closeQuicklook(win, true) })

    this._ql.push(win)
  }

  /**
   * Closes a specific quicklook window
   * @param  {BrowserWindow}  win           The reference to a BrowserWindow
   * @param  {Boolean} [alreadyClosed=false] Whether or not the window is already closed
   * @return {void}                        No return.
   */
  closeQuicklook (win, alreadyClosed = false) {
    let found = this._ql.find((elem) => elem === win)
    if (found) {
      if (!alreadyClosed) found.close()
      this._ql.splice(this._ql.indexOf(found), 1)
    }
  }

  /**
   * Closes all Quicklook windows.
   * @return {void} No return.
   */
  closeAll () {
    for (let win of this._ql) {
      win.close()
    }
  }
}

module.exports = ZettlrQLStandalone
