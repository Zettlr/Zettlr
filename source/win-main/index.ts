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

const ipcRenderer = window.ipc

// The first thing we have to do is run the window controller
windowRegister()
  .then(() => {
    afterRegister()
  })
  .catch(e => console.error(e))

function afterRegister (): void {
  const pinia = createPinia()
  // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
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
    const filesToOpen = []
    for (let i = 0; i < event.dataTransfer.files.length; i++) {
      const file = event.dataTransfer.files.item(i)
      if (file !== null) {
        filesToOpen.push(window.getPathForFile(file))
      }
    }

    ipcRenderer.invoke('application', { command: 'roots-add', payload: filesToOpen.filter(x => x !== undefined) })
      .catch(e => console.error(e))
    return false
  }, false)
}
