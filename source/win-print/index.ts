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

import Vue from 'vue'
import Print from './Print.vue'

import windowRegister from '../common/modules/window-register'

const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

// Register all window stuff
windowRegister()

// This window will be closed immediately on a window-close command
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'close-window') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
})

// Get additional data passed to the window
let filePath
[filePath] = window.process.argv.slice(-1)

const app = new Vue(Print)

// In the end: mount the app onto the DOM
app.$mount('#app')

app.$data.filePath = filePath
