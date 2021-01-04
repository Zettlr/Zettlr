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

import { ipcRenderer } from 'electron'
import path from 'path'

import windowRegister, { registerToolbar } from '../common/modules/window-register'
import { trans } from '../common/i18n'

// Register all window stuff
windowRegister({
  showMenubar: false // No menubar on print windows, only window controls
})

// This window will be closed immediately on a window-close command
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'close-window') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
})

// Get additional data passed to the window
let filePath
[filePath] = window.process.argv.slice(-1)

document.title = path.basename(filePath)

registerToolbar([
  {
    type: 'text',
    content: trans('menu.print'),
    style: 'strong'
  },
  {
    type: 'button',
    label: '',
    icon: 'printer',
    onClickHandler: () => {
      // NOTE: Printing only works in production, as during development
      // contents are served from localhost:3000 (which gives a CORS error)
      window.frames[0].print()
    }
  }
])

// TODO: With safe-file:// added electron crashes as soon as the print window
// is opened
const content = document.getElementById('app')
if (content !== null) {
  content.innerHTML = `<iframe src="file://${filePath}"></iframe>`
}

reposition() // Initial reposition

window.addEventListener('resize', (e) => {
  reposition()
})

// Toggle the maximisation of the window by double clicking. (Windows will
// take care of this already, but not Linux and macOS.)
document.getElementById('toolbar')?.addEventListener('dblclick', (e) => {
  ipcRenderer.send('window-controls', { command: 'win-maximise' })
})

function reposition (): void {
  const toolbar = document.getElementById('toolbar')
  const rect = toolbar?.getBoundingClientRect()
  if (rect === undefined) {
    return
  }

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
