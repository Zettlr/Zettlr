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

import { createApp } from 'vue'
import App from './App.vue'
import windowRegister from '@common/modules/window-register'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'

const ipcRenderer = window.ipc

// The first thing we have to do is run the window controller
windowRegister()

const app = createApp(App).mount('#app')

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
      app.$data.fontSize = window.config.get('editor.fontSize')
    }
  }
})

// Finally, pass the correct file to the application to view
const searchParams = new URLSearchParams(window.location.search)
const filePath = searchParams.get('file')

if (filePath === null) {
  console.error('Could not load file to quicklook, since the passed file was null!')
} else {
  setTimeout(() => {
    ipcRenderer.invoke('application', { command: 'get-file-contents', payload: filePath })
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
        app.$data.firstHeading = (file.type === 'file') ? file.firstHeading : null
        app.$data.frontmatter = (file.type === 'file') ? file.frontmatter : null
        app.$data.linefeed = file.linefeed
        app.$data.modified = file.modified
        app.$data.content = file.content
        // Set the correct font size
        app.$data.fontSize = window.config.get('editor.fontSize')
      }).catch((e) => {
        console.error(e)
      })
  }, 10)
}
