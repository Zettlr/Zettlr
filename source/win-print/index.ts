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

import { createApp } from 'vue'
import App from './App.vue'

import windowRegister from '@common/modules/window-register'

const ipcRenderer = window.ipc

// Register all window stuff
windowRegister()

// This window will be closed immediately on a window-close command
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'close-window') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
})

const app = createApp(App).mount('#app')

// Finally, pass the correct file to the application to preview
const searchParams = new URLSearchParams(window.location.search)
const filePath = searchParams.get('file')

if (filePath === null) {
  console.error('Could not load file to preview, since the passed file was null!')
} else {
  app.$data.filePath = filePath
}
