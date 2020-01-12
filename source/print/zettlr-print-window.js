/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPrintWindow class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single Quicklook window
 *
 * END HEADER
 */

const loadI18nRenderer = require('../common/lang/load-i18n-renderer')
const ipc = require('electron').ipcRenderer
const path = require('path')

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrPrintWindow {
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
    loadI18nRenderer()

    // Directly inject the correct body class
    $('body').addClass(process.platform)

    // Find out which file we should request
    let url = new URL(window.location.href)
    let name = url.searchParams.get('file')
    // Load the file into an iFrame.
    this.init(name)

    // Also we need to know whether or not we should initiate in darkMode.
    let dm = url.searchParams.get('darkMode')
    if (dm === 'true') $('body').addClass('dark')

    // Toggle the theme if there's an appropriate event
    ipc.on('toggle-theme', (e) => { $('body').toggleClass('dark') })

    // activate event listeners for the window
    this._act()
  }

  init (name) {
    this._file = name
    document.title = path.basename(name)
    $('.title h1').text(path.basename(name))
    $('.content').html(`<iframe src="${name}"></iframe>`)
    this._reposition() // Initial reposition
  }

  _act () {
    // Activate the window controls.
    $('.windows-window-controls .close').click((e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.windows-window-controls .resize').click((e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.windows-window-controls .minimise').click((e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })

    $('.linux-window-controls .close').click((e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.linux-window-controls .maximise').click((e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.linux-window-controls .minimise').click((e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })

    window.addEventListener('resize', (e) => {
      this._reposition()
    })

    // Toggle the maximisation of the window by double clicking. (Windows will
    // take care of this already, but not Linux and macOS.)
    $('.title').on('dblclick', (e) => {
      ipc.send('message', { 'command': 'win-maximise', 'content': '{}' })
    })

    // Issue a print command for the frame.
    $('#init-print').click((e) => {
      window.frames[0].print()
    })
  }

  /**
   * Matches the height of the iframe to the new constraints.
   * @return {void} Does not return.
   */
  _reposition () {
    let titleHeight = $('.title').first().outerHeight()
    $('iframe').first().css('height', $('body').outerHeight() - titleHeight + 'px')
    $('iframe').first().css('top', titleHeight + 'px')
  }
}

module.exports = ZettlrPrintWindow
