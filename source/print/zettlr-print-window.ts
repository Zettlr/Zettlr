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

import { ipcRenderer as ipc } from 'electron'
import path from 'path'
import loadIcons from '../renderer/util/load-icons'

import windowRegister from '../common/modules/window-register'

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrPrintWindow {
  private _file: string
  /**
    * Create a window
    * @param {ZettlrBody} parent   Calling object
    * @param {ZettlrFile} file     The file whose content should be displayed
    */
  constructor () {
    this._file = ''

    // Register all window stuff
    windowRegister({
      showMenubar: false // No menubar on print windows, only window controls
    })

    // Get additional data passed to the window
    let name
    [name] = window.process.argv.slice(-1)

    // Load the file into an iFrame
    this.init(name)

    // activate event listeners for the window
    this._act()
  }

  init (name: string): void {
    this._file = name
    document.title = path.basename(name)
    const h1 = document.querySelector('.title h1')
    if (h1 === null) return
    h1.textContent = path.basename(name)
    // TODO: With safe-file:// added electron crashes as soon as the print window
    // is opened
    const content = document.querySelector('.content')
    if (content === null) return

    content.innerHTML = `<iframe src="file://${name}"></iframe>`

    // Load the clarity icon modules, add custom icons and then refresh
    // attachments (because it requires custom icons to be loaded).
    setTimeout(() => {
      loadIcons().catch(e => console.error(e))
    }, 0)

    this._reposition() // Initial reposition
  }

  _act (): void {
    window.addEventListener('resize', (e) => {
      this._reposition()
    })

    // Toggle the maximisation of the window by double clicking. (Windows will
    // take care of this already, but not Linux and macOS.)
    document.querySelector('.title')?.addEventListener('dblclick', (e) => {
      ipc.send('window-controls', 'win-maximise')
    })

    // Issue a print command for the frame.
    document.getElementById('init-print')?.addEventListener('click', (e) => {
      window.frames[0].print()
    })
  }

  /**
   * Matches the height of the iframe to the new constraints.
   * @return {void} Does not return.
   */
  _reposition (): void {
    let titleElement = document.querySelector('.title')
    const rect = titleElement?.getBoundingClientRect()
    if (rect === undefined) return

    let top = rect.height

    if (document.body.classList.contains('show-menubar')) {
      const menubar = document.getElementById('menubar')
      if (menubar !== null) {
        top += menubar.getBoundingClientRect().height
      }
    }

    const bodyHeight = document.body.getBoundingClientRect().height

    const iframe = document.querySelector('iframe')
    if (iframe === null) return

    iframe.style.height = `${bodyHeight - top}px`
    iframe.style.top = `${top}px`
  }
}

module.exports = new ZettlrPrintWindow()
