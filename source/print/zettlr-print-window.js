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

// Include the geometry style of the app (will be included in the html by webpack magic)
require('./../common/assets/less/main.less')

const loadI18nRenderer = require('../common/lang/load-i18n-renderer')
const ipc = require('electron').ipcRenderer
const path = require('path')
// TODO: Move to common directory!
const loadicons = require('../renderer/util/load-icons')

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

    // Get additional data passed to the window
    let name, darkMode
    [ name, darkMode ] = window.process.argv.slice(-2)

    // Load the file into an iFrame
    this.init(name)

    // Switch to darkMode if necessary
    if (darkMode === 'true') $('body').addClass('dark')

    // Toggle the theme if there's an appropriate event
    ipc.on('toggle-theme', (e) => { $('body').toggleClass('dark') })

    // activate event listeners for the window
    this._act()
  }

  init (name) {
    this._file = name
    document.title = path.basename(name)
    document.querySelector('.title h1').textContent = path.basename(name)
    $('.content').html(`<iframe src="${name}"></iframe>`)

    // Load the clarity icon modules, add custom icons and then refresh
    // attachments (because it requires custom icons to be loaded).
    setTimeout(() => loadicons(), 0)

    this._reposition() // Initial reposition
  }

  _act () {
    // Activate the window controls.
    $('.windows-window-controls .close').click((e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.windows-window-controls .resize').click((e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.windows-window-controls .minimise').click((e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })

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

module.exports = new ZettlrPrintWindow()
