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
import store from './store'
import Vuex from 'vuex'

import 'vue-virtual-scroller/dist/vue-virtual-scroller.css'

// Indicate that we would like to use a vuex store
Vue.use(Vuex)

// Then create the global application store -- currently
// it's only used for the file manager, but in perspective
// we'll be using it throughout the renderer.
var applicationStore = new Vuex.Store(store)

export default (): Vue => {
  return new Vue({
    // Destructure the App config object, and enrich with store and hook
    ...App,
    store: applicationStore,
    el: '#file-manager'
  })
}
