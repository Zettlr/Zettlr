/* global $ */
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

const ZettlrQuicklook = require('../renderer/zettlr-quicklook.js')
const ipc = require('electron').ipcRenderer

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrQuicklookWindow {
  /**
    * Create a window
    * @param {ZettlrBody} parent   Calling object
    * @param {ZettlrFile} file     The file whose content should be displayed
    */
  constructor () {
    this._file = null
    this._ql = null

    // as this class basically acts as the renderer class, we also have to take
    // care of specifics such as getting the translation strings, etc.
    global.i18n = JSON.parse(JSON.stringify(require('electron').remote.getGlobal('i18n')))

    // Directly inject the correct body class
    $('body').addClass(process.platform)

    // Find out which file we should request
    let url = new URL(window.location.href)
    let hash = url.searchParams.get('file')
    // First sending must go out of the first tick of the application
    setTimeout(() => { ipc.send('message', { 'command': 'ql-get-file', 'content': hash }) }, 10)
    // Listen for the file event to receive the file to display from main.
    ipc.on('file', (e, file) => { this.init(file) })

    // Also we need to know whether or not we should initiate in darkMode.
    let dm = url.searchParams.get('darkMode')
    if (dm === 'true') $('body').addClass('dark')

    // Toggle the theme if there's an appropriate event
    ipc.on('toggle-theme', (e) => { $('body').toggleClass('dark') })

    // activate event listeners for the window
    this._act()
  }

  init (file) {
    if (this._ql) this._ql.close() // This enables us to "init" everytime we receive the file
    this._file = file
    document.title = file.name // Update the window's title
    // Quicklook windows open themselves automatically. We only have to indicate
    // that this thing is a standalone.
    this._ql = new ZettlrQuicklook(this, this._file)
  }

  _act () {
    // Activate the window controls.
    $('.windows-window-controls .close').click((e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.windows-window-controls .resize').click((e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.windows-window-controls .minimise').click((e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })

    $('.linux-window-controls .close').click((e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.linux-window-controls .maximise').click((e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.linux-window-controls .minimise').click((e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })
  }
}

module.exports = ZettlrQuicklookWindow
