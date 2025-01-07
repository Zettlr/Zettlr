/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Update window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file is the updater's procedural file.
 *                  It is the main entry point for the window. It simply loads
 *                  the renderer process and initialises everything.
 *
 * END HEADER
 */

import windowRegister from '@common/modules/window-register'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'

const ipcRenderer = window.ipc

windowRegister()
  .then(() => {
    const pinia = createPinia()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    const app = createApp(App).use(pinia)
    app.mount('#app')

    // This window will be closed immediately on a window-close command
    ipcRenderer.on('shortcut', (event, shortcut) => {
      if (shortcut === 'close-window') {
        ipcRenderer.send('window-controls', { command: 'win-close' })
      }
    })
  })
  .catch(e => console.error(e))
