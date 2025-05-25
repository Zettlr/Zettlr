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

import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

import windowRegister from '@common/modules/window-register'

const ipcRenderer = window.ipc

// Register all window stuff
windowRegister()
  .then(() => {
    // This window will be closed immediately on a window-close command
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'close-window') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    })

    const pinia = createPinia()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    createApp(App).use(pinia).mount('#app')
  })
  .catch(e => console.error(e))
