/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Main window entry file
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Main entry point for the main application window.
 *
 * END HEADER
 */

import windowRegister from '@common/modules/window-register'
import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import { useOpenDirectoryStore } from '../pinia'

const ipcRenderer = window.ipc

// The first thing we have to do is run the window controller
windowRegister()
  .then(() => {
    afterRegister()
  })
  .catch(e => console.error(e))

function afterRegister (): void {
  const pinia = createPinia()
  const app = createApp(App).use(pinia)

  app.mount('#app')

  document.addEventListener('dragover', function (event) {
    event.preventDefault()
    return false
  }, false)

  // On drop, tell the renderer to tell main that there's something to
  // handle.
  document.addEventListener('drop', (event) => {
    event.preventDefault()
    if (event.dataTransfer === null) {
      return
    }

    // Retrieve all paths
    let f = []
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files.item(i)
      if (file !== null) {
        f.push(file.path)
      }
    }

    ipcRenderer.invoke('application', { command: 'roots-add', payload: f })
      .catch(e => console.error(e))
    return false
  }, false)

  // -----------------------------------------------------------------------------

  // Further shortcuts we have to listen to
  ipcRenderer.on('shortcut', (event, command) => {
    // Retrieve the correct contexts first
    const dirDescriptor = useOpenDirectoryStore().openDirectory

    if (command === 'new-dir') {
      if (dirDescriptor === null) {
        return // Cannot create a new directory
      }

      ipcRenderer.invoke('application', {
        command: 'dir-new',
        payload: { path: dirDescriptor.path }
      })
        .catch(err => console.error(err))
    } else if (command === 'delete-dir') {
      if (dirDescriptor === null) {
        return // Cannot remove dir
      }

      ipcRenderer.invoke('application', {
        command: 'dir-delete',
        payload: { path: dirDescriptor.path }
      })
        .catch(err => console.error(err))
    }
  })
}
