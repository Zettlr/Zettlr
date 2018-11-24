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
const url = require('url')
const { BrowserWindow } = require('electron')

class ZettlrQLStandalone {
  /**
   * Initates the Quicklook Window reference array.
   */
  constructor () {
    this._ql = []
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
      icon: 'icons/png/64x64.png',
      backgroundColor: '#fff',
      scrollBounce: true, // The nice scrolling effect for macOS
      defaultEncoding: 'utf8' // Why the hell does this default to ISO?
    }

    // First create a new browserWindow
    let win = new BrowserWindow(winConf)

    // Then activate listeners.
    // and load the index.html of the app.
    win.loadURL(url.format({
      pathname: path.join(__dirname, '../quicklook/index.htm'),
      protocol: 'file:',
      slashes: true,
      search: `file=${file.hash}`
    }))
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
