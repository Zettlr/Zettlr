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
import { ipcRenderer } from 'electron'
import PopupProvider from './popup-provider'

// The first thing we have to do is run the window controller
windowRegister()

Vue.use(Vuex)
Vue.use(PopupProvider) // Exposes $showPopover and $closePopover

// Create the Vue app
const app = new Vue({
  ...App,
  store: createStore()
})

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
let openFilesUpdateLock = false
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
    if (openFilesUpdateLock) {
      return
    }

    openFilesUpdateLock = true
    app.$store.dispatch('updateOpenFiles')
      .catch(e => console.error(e))
      .finally(() => { openFilesUpdateLock = false })
  }
})

// Initial update
filetreeUpdateLock = true
openDirectoryLock = true
activeFileUpdateLock = true
openFilesUpdateLock = true
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
  .finally(() => { openFilesUpdateLock = false })
