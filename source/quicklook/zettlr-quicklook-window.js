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

const ZettlrQuicklook = require('./zettlr-quicklook')
const loadI18nRenderer = require('../common/lang/load-i18n-renderer')
const ipc = require('electron').ipcRenderer
const { trans } = require('../common/lang/i18n')

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
    */
  constructor () {
    let url = new URL(window.location.href)

    this._file = null
    this._ql = null
    this._theme = null
    this.setTheme(url.searchParams.get('theme'))

    // as this class basically acts as the renderer class, we also have to take
    // care of specifics such as getting the translation strings, etc.
    loadI18nRenderer()

    // Directly inject the correct body class
    document.body.classList.add(process.platform)

    // Translate the placeholder attribute
    document.getElementById('searchWhat').setAttribute('placeholder', trans('dialog.find.find_placeholder'))

    // Find out which file we should request
    let hash = url.searchParams.get('file')
    // First sending must go out of the first tick of the application
    setTimeout(() => {
      ipc.send('message', { 'command': 'ql-get-file', 'content': hash })
      // Apply the custom CSS stylesheet to the head element
      ipc.send('message', { 'command': 'get-custom-css-path', 'content': {} })
    }, 10)

    // Listen for the file event to receive the file to display from main.
    ipc.on('file', (e, file) => { this.setContent(file) })

    // Also we need to know whether or not we should initiate in darkMode, and
    // which theme to use initially.
    if (url.searchParams.get('darkMode') === 'true') document.body.classList.add('dark')

    ipc.on('custom-css', (evt, cnt) => {
      let customCss = document.getElementById('custom-css-link')
      if (customCss) customCss.remove() // Remove any prior link

      let lnk = document.createElement('link')
      lnk.setAttribute('href', 'file://' + cnt + '?' + Date.now())
      lnk.setAttribute('type', 'text/css')
      lnk.setAttribute('id', 'custom-css-link')

      document.head.appendChild(lnk)
    })

    ipc.on('config-update', (evt, config) => {
      // First update externalities
      if (config.darkTheme) {
        document.body.classList.add('dark')
      } else {
        document.body.classList.remove('dark')
      }

      if (config.display.theme !== this._theme) this.setTheme(config.display.theme)

      // ... and then the CodeMirror instance
      if (this._ql) this._ql.onConfigUpdate(config)
    })

    // activate event listeners for the window
    this._act()
  }

  setTheme (theme = this._theme) {
    this._theme = theme
    let css = document.getElementById('theme-css').getAttribute('href')
    document.getElementById('theme-css').setAttribute('href', css.replace(/bielefeld|berlin|frankfurt|karl-marx-stadt|bordeaux/, this._theme))
  }

  setContent (file) {
    this._file = file

    // Update the title
    document.title = file.name
    document.querySelector('h1').textContent = this._file.name

    if (!this._ql) {
      this._ql = new ZettlrQuicklook(this, this._file)
    } else {
      // Simply set the content
      this._ql.setContent(this._file)
    }
  }

  _act () {
    // Activate the window controls.
    let winClose = document.querySelectorAll('.windows-window-controls .close')[0]
    let winResize = document.querySelectorAll('.windows-window-controls .resize')[0]
    let winMin = document.querySelectorAll('.windows-window-controls .minimise')[0]
    let linuxClose = document.querySelectorAll('.linux-window-controls .close')[0]
    let linuxResize = document.querySelectorAll('.linux-window-controls .maximise')[0]
    let linuxMin = document.querySelectorAll('.linux-window-controls .minimise')[0]

    winClose.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-close', content: {} })
    })

    winResize.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-maximise', content: {} })
    })

    winMin.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-minimise', content: {} })
    })

    linuxClose.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-close', content: {} })
    })

    linuxResize.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-maximise', content: {} })
    })

    linuxMin.addEventListener('click', (e) => {
      ipc.send('message', { 'command': 'win-minimise', content: {} })
    })
  }
}

module.exports = ZettlrQuicklookWindow
