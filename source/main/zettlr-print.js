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
const url = require('url')
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
      icon: 'icons/png/64x64.png',
      webPreferences: {
        // Zettlr needs all the node features, so in preparation for Electron
        // 5.0 we'll need to explicitly request it.
        nodeIntegration: true
      },
      backgroundColor: '#fff',
      frame: false, // No frame for quicklook windows. Mainly prevents the menu bar to be shown on win+linux
      scrollBounce: true, // The nice scrolling effect for macOS
      defaultEncoding: 'utf8' // Why the hell does this default to ISO?
    }

    // On macOS create a chromeless window with the window controls.
    if (process.platform === 'darwin') {
      winConf.titleBarStyle = 'hiddenInset'
    }

    // Remove the frame on Linux and Windows
    if (process.platform === 'linux' || process.platform === 'win32') {
      winConf.frame = false
    }

    // First create a new browserWindow
    let win = new BrowserWindow(winConf)

    // Then activate listeners.
    // and load the index.html of the app.
    win.loadURL(url.format({
      pathname: path.join(__dirname, '../print/index.htm'),
      protocol: 'file:',
      slashes: true,
      search: `file=${file}&darkMode=${global.config.get('darkTheme')}`
    }))
    // Only show window once it is completely initialized
    win.once('ready-to-show', () => { win.show() })
    // As soon as the window is closed, reset it to null.
    win.on('closed', () => { this._win = null })

    this._win = win
  }
}

module.exports = ZettlrPrint
