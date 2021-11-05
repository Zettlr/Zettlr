/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Project Properties
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the project properties window
 *
 * END HEADER
 */

import Vue from 'vue'
import ProjectProperties from './ProjectProperties.vue'

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

const app = new Vue(ProjectProperties)
app.$mount('#app')

// Finally, pass the correct directory
const searchParams = new URLSearchParams(window.location.search)
const dirPath = searchParams.get('directory')

if (dirPath === null) {
  console.error('Could not load properties, since the passed directory was null!')
} else {
  app.$data.dirPath = dirPath
}
