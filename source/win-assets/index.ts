/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Error window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Main entry point for the paste images modal
 *
 * END HEADER
 */

import { createApp } from 'vue'
import App from './App.vue'
import { createPinia } from 'pinia'
import windowRegister from '@common/modules/window-register'

const ipcRenderer = window.ipc

// The first thing we have to do is run the window controller
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
        // TODO: Probably it's nice to see if there are any unsaved changes before?
      }
    })
  })
  .catch(e => console.error(e))
