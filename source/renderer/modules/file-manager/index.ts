/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File manager exporting module.
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     In this module, the file manager is assembled and the global
 *                  store is initialised. The only necessary thing is that
 *                  the exported function needs to be called.
 *
 * END HEADER
 */

import Vue from 'vue'
import App from './file-manager.vue'
import createStore from './store'
import Vuex from 'vuex'
import { ipcRenderer } from 'electron'

/**
 * Updated the coloured tags in the store
 */
function updateColouredTags (): void {
  ipcRenderer.invoke('tag-provider', {
    command: 'get-coloured-tags'
  })
    .then(tags => {
      store.commit('tags', tags)
    })
    .catch(e => console.error(e))
}

// Indicate that we would like to use a vuex store
Vue.use(Vuex)

const store = createStore()

ipcRenderer.on('coloured-tags', (event) => {
  // Update the tags
  updateColouredTags()
})

// Send the first update for tags
updateColouredTags()

// Then create the global application store -- currently
// it's only used for the file manager, but in perspective
// we'll be using it throughout the renderer.

export default (): Vue => {
  return new Vue({
    // Destructure the App config object, and enrich with store and hook
    ...App,
    store: store,
    el: '#app'
  })
}
