/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Log Viewer window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the log viewer's procedural file. It is
 *                  the main entry point for the application. It simply loads
 *                  the renderer process and initialises everything.
 *
 * END HEADER
 */

import Vue from 'vue'
import Quicklook from './Quicklook.vue'
import windowRegister from '../common/modules/window-register'
// import { ToolbarControl } from '../common/modules/window-register/register-toolbar'
import { CodeFileMeta, MDFileMeta } from '../main/modules/fsal/types'

const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

// The first thing we have to do is run the window controller
windowRegister()

// This window will be closed immediately on a window-close command
ipcRenderer.on('shortcut', (event, shortcut) => {
  if (shortcut === 'close-window') {
    ipcRenderer.send('window-controls', { command: 'win-close' })
  }
})

ipcRenderer.on('config-provider', (event, message) => {
  const { command } = message
  if (command === 'update') {
    const { payload } = message
    if (payload === 'editor.fontSize') {
      app.$data.fontSize = global.config.get('editor.fontSize')
    }
  }
})

// Create the Vue app because we need to reference it in our toolbar controls
const app = new Vue(Quicklook)

// Get the hash from the window arguments
let hash: string
[hash] = window.process.argv.slice(-1)

setTimeout(() => {
  ipcRenderer.invoke('quicklook-controller', { command: 'get-file', hash: hash })
    .then((file: MDFileMeta|CodeFileMeta) => {
      app.$data.name = file.name
      app.$data.dir = file.dir
      app.$data.hash = file.hash
      app.$data.modtime = file.modtime
      app.$data.creationtime = file.creationtime
      app.$data.ext = file.ext
      app.$data.id = (file.type === 'file') ? file.id : ''
      app.$data.type = file.type
      app.$data.tags = (file.type === 'file') ? file.tags : ''
      app.$data.wordCount = (file.type === 'file') ? file.wordCount : 0
      app.$data.charCount = (file.type === 'file') ? file.charCount : 0
      app.$data.target = (file.type === 'file') ? file.target : null
      app.$data.firstHeading = (file.type === 'file') ? file.firstHeading : null
      app.$data.frontmatter = (file.type === 'file') ? file.frontmatter : null
      app.$data.linefeed = file.linefeed
      app.$data.modified = file.modified
      app.$data.content = file.content
      // Set the correct font size
      app.$data.fontSize = global.config.get('editor.fontSize')
    }).catch((e) => {
      console.error(e)
    })
}, 10)

// In the end: mount the app onto the DOM
app.$mount('#app')
