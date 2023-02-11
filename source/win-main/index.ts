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
// import { createStore } from 'vuex'
import App from './App.vue'
import createStore, { key as storeKey } from './store'
import PopupProvider from './popup-provider'
import { DP_EVENTS } from '@dts/common/documents'

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

  // Create the Vue app. We additionally use appStore, which exposes $store, and
  // PopupProvider, which exposes $showPopover, $togglePopover, and $closePopover
  const app = createApp(App).use(appStore, storeKey).use(PopupProvider).mount('#app')

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
        app.$store.commit('colouredTags', tags)
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
      app.$store.commit('updateConfig', payload)
    }
  })

  // Listen for document state updates
  ipcRenderer.on('documents-update', (evt, payload) => {
    app.$store.dispatch('documentTree', payload).catch(err => console.error(err))
  })

  // -----------------------------------------------------------------------------
  let filetreeUpdateLock = false
  let openDirectoryLock = false

  // Listen for broadcasts from main in order to update the filetree
  ipcRenderer.on('fsal-state-changed', (event, kind: string) => {
    if (kind === 'filetree') {
      if (filetreeUpdateLock) {
        return
      }

      filetreeUpdateLock = true
      app.$store.dispatch('filetreeUpdate')
        .catch(e => console.error(e))
        .finally(() => { filetreeUpdateLock = false })
    } else if (kind === 'openDirectory') {
      if (openDirectoryLock) {
        return
      }

      openDirectoryLock = true
      app.$store.dispatch('updateOpenDirectory')
        .catch(e => console.error(e))
        .finally(() => { openDirectoryLock = false })
    }
  })

  ipcRenderer.on('documents-update', (event, payload) => {
    // A file has been saved or modified
    if (payload.event === DP_EVENTS.CHANGE_FILE_STATUS && payload.status === 'modification') {
      app.$store.dispatch('updateModifiedFiles')
        .catch(e => console.error(e))
    }
  })

  ipcRenderer.on('targets-provider', (event, what: string) => {
    if (what === 'writing-targets-updated') {
      app.$store.dispatch('updateWritingTargets')
        .catch(e => console.error(e))
    }
  })

  ipcRenderer.on('assets-provider', (event, what: string) => {
    if (what === 'snippets-updated') {
      app.$store.dispatch('updateSnippets')
        .catch(e => console.error(e))
    }
  })

  // Initial update
  filetreeUpdateLock = true
  openDirectoryLock = true
  app.$store.dispatch('filetreeUpdate')
    .catch(e => console.error(e))
    .finally(() => { filetreeUpdateLock = false })
  app.$store.dispatch('updateOpenDirectory')
    .catch(e => console.error(e))
    .finally(() => { openDirectoryLock = false })
  app.$store.dispatch('documentTree', { event: 'init', context: { windowId } })
    .catch(err => console.error(err))
  app.$store.dispatch('updateModifiedFiles')
    .catch(e => console.error(e))
  app.$store.dispatch('updateSnippets')
    .catch(e => console.error(e))
  app.$store.dispatch('updateWritingTargets')
    .catch(e => console.error(e))

  // -----------------------------------------------

  // Further shortcuts we have to listen to
  ipcRenderer.on('shortcut', (event, command) => {
    // Retrieve the correct contexts first
    const dirDescriptor = app.$store.state.selectedDirectory
    const fileDescriptor = app.$store.state.activeFile

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
      app.$store.commit('toggleDistractionFree')
    }
  })
}
