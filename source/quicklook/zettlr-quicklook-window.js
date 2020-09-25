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

// Include the geometry style of the app (will be included in the html by webpack magic)
require('./../common/assets/less/main.less')

const ZettlrQuicklook = require('./zettlr-quicklook')
const ThemeHandler = require('./../common/theme-handler').default
const loadI18nRenderer = require('../common/lang/load-i18n-renderer')
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
    // Get additional data passed to the window
    let hash, darkMode, theme
    [ hash, darkMode, theme ] = window.process.argv.slice(-3)

    let themeHandler = new ThemeHandler()

    // as this class basically acts as the renderer class, we also have to take
    // care of specifics such as getting the translation strings, etc.
    loadI18nRenderer()

    // Directly inject the correct body class
    $('body').addClass(process.platform)

    // First sending must go out of the first tick of the application
    setTimeout(() => {
      ipc.send('message', { 'command': 'ql-get-file', 'content': hash })
      // Apply the custom CSS stylesheet to the head element
      ipc.send('message', { 'command': 'get-custom-css-path', 'content': {} })
    }, 10)
    // Listen for the file event to receive the file to display from main.
    ipc.on('file', (e, file) => { this.init(file) })

    // Also we need to know whether or not we should initiate in darkMode, and
    // which theme to use initially.
    if (darkMode === 'true') $('body').addClass('dark')
    themeHandler.switchTo(theme)

    ipc.on('custom-css', (evt, cnt) => {
      $('#custom-css-link').detach() // Remove any prior link
      let lnk = $('<link>').attr('rel', 'stylesheet')
      lnk.attr('href', 'file://' + cnt + '?' + Date.now())
      lnk.attr('type', 'text/css')
      lnk.attr('id', 'custom-css-link')
      $('head').first().append(lnk)
    })

    ipc.on('config-update', (evt, config) => {
      console.log(config)
      // First update externalities
      if (config.darkTheme) {
        $('body').addClass('dark')
      } else {
        $('body').removeClass('dark')
      }

      themeHandler.switchTo(config.display.theme)

      // ... and then the CodeMirror instance
      this._ql.onConfigUpdate(config)
    })

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
    $('.windows-window-controls .close').on('click', (e) => { ipc.send('message', { 'command': 'win-close', content: {} }) })
    $('.windows-window-controls .resize').on('click', (e) => { ipc.send('message', { 'command': 'win-maximise', content: {} }) })
    $('.windows-window-controls .minimise').on('click', (e) => { ipc.send('message', { 'command': 'win-minimise', content: {} }) })
  }
}

module.exports = new ZettlrQuicklookWindow()
