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

import windowRegister from '../common/modules/window-register'
import Vue from 'vue'
import Vuex from 'vuex'
import App from './App.vue'
import createStore from './store'
import PopupProvider from './popup-provider'

const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

// The first thing we have to do is run the window controller
windowRegister()

Vue.use(Vuex)
Vue.use(PopupProvider) // Exposes $showPopover, $togglePopover, and $closePopover

// Create the Vue app
const app = new Vue({
  ...App,
  store: createStore()
})

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

  ipcRenderer.invoke('application', { command: 'handle-drop', payload: f })
    .catch(e => console.error(e))
  return false
}, false)

// In the end: mount the app onto the DOM
app.$mount('#app')

// -----------------------------------------------------------------------------

/**
 * Listen to update events
 */
function updateColouredTags (): void {
  ipcRenderer.invoke('tag-provider', {
    command: 'get-coloured-tags'
  })
    .then(tags => {
      app.$store.commit('colouredTags', tags)
    })
    .catch(e => console.error(e))
}

ipcRenderer.on('coloured-tags', (event) => {
  // Update the tags
  updateColouredTags()
})

// Send the first update for tags
updateColouredTags()

// -----------------------------------------------------------------------------

function updateCitationDatabase (): void {
  ipcRenderer.invoke('citeproc-provider', { command: 'get-items' })
    .then(cslData => {
      app.$store.commit('updateCSLItems', cslData)
    })
    .catch(err => console.error(err))
}

ipcRenderer.on('citeproc-provider', (event, message) => {
  if (message === 'database-changed') {
    updateCitationDatabase()
  }
})

updateCitationDatabase()

// -----------------------------------------------------------------------------

// Update the configuration if some value changes
ipcRenderer.on('config-provider', (event, { command, payload }) => {
  if (command === 'update') {
    app.$store.commit('updateConfig', payload)
  }
})

// -----------------------------------------------------------------------------

// Listen for updates to the tag database
ipcRenderer.on('tags', (event) => {
  ipcRenderer.invoke('tag-provider', { command: 'get-tags-database' })
    .then(tags => {
      app.$store.commit('updateTagDatabase', tags)
    })
    .catch(e => console.error(e))
})

// Also send an initial update
ipcRenderer.invoke('tag-provider', { command: 'get-tags-database' })
  .then(tags => {
    app.$store.commit('updateTagDatabase', tags)
  })
  .catch(e => console.error(e))

// -----------------------------------------------------------------------------
let filetreeUpdateLock = false
let openDirectoryLock = false
let activeFileUpdateLock = false
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
  } else if (kind === 'activeFile') {
    if (activeFileUpdateLock) {
      return
    }

    activeFileUpdateLock = true
    app.$store.dispatch('updateActiveFile')
      .catch(e => console.error(e))
      .finally(() => { activeFileUpdateLock = false })
  } else if (kind === 'openFiles') {
    app.$store.dispatch('updateOpenFiles')
      .catch(e => console.error(e))
  }
})

// Initial update
filetreeUpdateLock = true
openDirectoryLock = true
activeFileUpdateLock = true
app.$store.dispatch('filetreeUpdate')
  .catch(e => console.error(e))
  .finally(() => { filetreeUpdateLock = false })
app.$store.dispatch('updateOpenDirectory')
  .catch(e => console.error(e))
  .finally(() => { openDirectoryLock = false })
app.$store.dispatch('updateActiveFile')
  .catch(e => console.error(e))
  .finally(() => { activeFileUpdateLock = false })
app.$store.dispatch('updateOpenFiles')
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
  }
})
