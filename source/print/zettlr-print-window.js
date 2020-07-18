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
    let url = new URL(window.location.href)

    this._file = null
    this._ql = null
    this._iframe = null
    this._titleElem = null
    this._theme = null
    this.setTheme(url.searchParams.get('theme'))

    // as this class basically acts as the renderer class, we also have to take
    // care of specifics such as getting the translation strings, etc.
    loadI18nRenderer()

    // Directly inject the correct body class
    document.body.classList.add(process.platform)

    // Find out which file we should request
    let name = url.searchParams.get('file')
    // Load the file into an iFrame.
    this.init(name)

    // Also we need to know whether or not we should initiate in darkMode.
    let dm = url.searchParams.get('darkMode')
    if (dm === 'true') document.body.classList.add('dark')

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
    })

    // activate event listeners for the window
    this._act()
  }

  init (name) {
    this._file = name
    let basename = path.basename(name)
    document.title = basename

    // Store some necessary values for later use
    this._titleElem = document.querySelectorAll('.title')[0]

    let title = document.querySelectorAll('.title h1')[0]
    title.textContent = basename

    this._iframe = document.createElement('iframe')
    document.querySelector('.content').appendChild(this._iframe)
    this._iframe.setAttribute('src', name)
    this._reposition() // Initial reposition
  }

  /**
   * Sets the theme according to the new parameter
   */
  setTheme (theme = this._theme) {
    this._theme = theme
    let css = document.getElementById('theme-css').getAttribute('href')
    document.getElementById('theme-css').setAttribute('href', css.replace(/bielefeld|berlin|frankfurt|karl-marx-stadt|bordeaux/, this._theme))
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

    window.addEventListener('resize', (e) => {
      this._reposition()
    })

    // Toggle the maximisation of the window by double clicking. (Windows will
    // take care of this already, but not Linux and macOS.)
    this._titleElem.addEventListener('dblclick', (e) => {
      ipc.send('message', { 'command': 'win-maximise', 'content': '{}' })
    })

    // Issue a print command for the frame.
    document.getElementById('init-print').addEventListener('click', (event) => {
      this._iframe.contentWindow.print()
    })
  }

  /**
   * Matches the height of the iframe to the new constraints.
   * @return {void} Does not return.
   */
  _reposition () {
    let titleHeight = this._titleElem.offsetHeight
    let windowHeight = window.innerHeight
    this._iframe.style.height = windowHeight - titleHeight + 'px'
    this._iframe.style.top = titleHeight + 'px'
  }
}

module.exports = ZettlrPrintWindow
