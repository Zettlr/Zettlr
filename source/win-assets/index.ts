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
import windowRegister from '@common/modules/window-register'

const ipcRenderer = window.ipc

// The first thing we have to do is run the window controller
windowRegister()
  .then(() => {
    const app = createApp(App)
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
