/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrQuicklook class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single Quicklook window
 *
 * END HEADER
 */

import windowRegister from '../common/modules/window-register'

import ZettlrQuicklook from './zettlr-quicklook'

import { ipcRenderer as ipc } from 'electron'

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrQuicklookWindow {
  private _ql: ZettlrQuicklook|null
  private _file: any

  /**
    * Create a window
    * @param {ZettlrBody} parent   Calling object
    * @param {ZettlrFile} file     The file whose content should be displayed
    */
  constructor () {
    this._ql = null
    // Get additional data passed to the window
    let hash: string
    [hash] = window.process.argv.slice(-1)

    // Register everything necessary for the window
    windowRegister({
      showMenubar: false // Do not show the menubar on Quicklook windows
    })

    // First sending must go out of the first tick of the application
    setTimeout(() => {
      ipc.send('message', { 'command': 'ql-get-file', 'content': hash })
      // Apply the custom CSS stylesheet to the head element
      ipc.send('message', { 'command': 'get-custom-css-path', 'content': {} })
    }, 10)
    // Listen for the file event to receive the file to display from main.
    ipc.on('file', (e, file) => {
      this._file = file
      document.title = file.name // Update the window's title
      // Quicklook windows open themselves automatically. We only have to indicate
      // that this thing is a standalone.
      this._ql = new ZettlrQuicklook(this, this._file)
    })

    ipc.on('config-update', (evt, config) => {
      // ... and then the CodeMirror instance
      this._ql?.onConfigUpdate(config)
    })
  }
}

module.exports = new ZettlrQuicklookWindow()
