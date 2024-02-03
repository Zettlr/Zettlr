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
import createStore, { key as storeKey } from './store'
import { DP_EVENTS, type OpenDocument } from '@dts/common/documents'
import { useOpenDirectoryStore } from '../pinia'

const ipcRenderer = window.ipc

const searchParams = new URLSearchParams(window.location.search)
const windowId = searchParams.get('window_id')

// The first thing we have to do is run the window controller
windowRegister()
  .then(() => {
    afterRegister()
  })
  .catch(e => console.error(e))

function afterRegister (): void {
  const appStore = createStore()
  const pinia = createPinia()

  // Create the Vue app. We additionally use appStore, which exposes $store, and
  // PopupProvider, which exposes $showPopover, $togglePopover, and $closePopover
  const app = createApp(App)
    .use(pinia)
    .use(appStore, storeKey)

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

  /**
   * Listen to update events
   */
  function updateColoredTags (): void {
    ipcRenderer.invoke('tag-provider', {
      command: 'get-colored-tags'
    })
      .then(tags => {
        app.config.globalProperties.$store.commit('colouredTags', tags)
      })
      .catch(e => console.error(e))
  }

  ipcRenderer.on('colored-tags', (event) => {
    // Update the tags
    updateColoredTags()
  })

  // Send the first update for tags
  updateColoredTags()

  // -----------------------------------------------------------------------------

  // Update the configuration if some value changes
  ipcRenderer.on('config-provider', (event, { command, payload }) => {
    if (command === 'update') {
      app.config.globalProperties.$store.commit('updateConfig', payload)
    }
  })

  // Listen for document state updates
  ipcRenderer.on('documents-update', (evt, payload) => {
    // A file has been saved or modified
    if (payload.event === DP_EVENTS.CHANGE_FILE_STATUS && payload.status === 'modification') {
      app.config.globalProperties.$store.dispatch('updateModifiedFiles')
        .catch(e => console.error(e))
    } else {
      app.config.globalProperties.$store.dispatch('documentTree', payload)
        .catch(err => console.error(err))
    }
  })

  // -----------------------------------------------------------------------------

  ipcRenderer.on('targets-provider', (event, what: string) => {
    if (what === 'writing-targets-updated') {
      app.config.globalProperties.$store.dispatch('updateWritingTargets')
        .catch(e => console.error(e))
    }
  })

  ipcRenderer.on('assets-provider', (event, what: string) => {
    if (what === 'snippets-updated') {
      app.config.globalProperties.$store.dispatch('updateSnippets')
        .catch(e => console.error(e))
    }
  })

  // Initial update
  app.config.globalProperties.$store.dispatch('documentTree', { event: 'init', context: { windowId } })
    .catch(err => console.error(err))
  app.config.globalProperties.$store.dispatch('updateModifiedFiles')
    .catch(e => console.error(e))
  app.config.globalProperties.$store.dispatch('updateSnippets')
    .catch(e => console.error(e))
  app.config.globalProperties.$store.dispatch('updateWritingTargets')
    .catch(e => console.error(e))

  // -----------------------------------------------

  // Further shortcuts we have to listen to
  ipcRenderer.on('shortcut', (event, command) => {
    // Retrieve the correct contexts first
    const dirDescriptor = useOpenDirectoryStore().openDirectory
    const fileDescriptor: OpenDocument|null = app.config.globalProperties.$store.getters.lastLeafActiveFile()

    if (command === 'new-dir') {
      if (dirDescriptor === null) {
        return // Cannot create a new directory
      }

      ipcRenderer.invoke('application', {
        command: 'dir-new',
        payload: { path: dirDescriptor.path }
      })
        .catch(err => console.error(err))
    } else if (command === 'delete-file') {
      if (fileDescriptor === null) {
        return // Cannot remove file
      }

      ipcRenderer.invoke('application', {
        command: 'file-delete',
        payload: { path: fileDescriptor.path }
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
    } else if (command === 'toggle-distraction-free') {
      app.config.globalProperties.$store.commit('toggleDistractionFree')
    }
  })
}
