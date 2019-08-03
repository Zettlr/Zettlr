/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Sidebar exporting module.
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     In this module, the sidebar is assembled and the global
 *                  store is initialised. The only necessary thing is that
 *                  the exported function needs to be called.
 *
 * END HEADER
 */

const Vue = require('vue')
const Vuex = require('vuex')
const App = require('./sidebar.vue').default
const store = require('./store.js')

require('vue-virtual-scroller/dist/vue-virtual-scroller.css')

// Indicate that we would like to use a vuex store
Vue.use(Vuex)

// Then create the global application store -- currently
// it's only used for the sidebar, but in perspective
// we'll be using it throughout the renderer.
var applicationStore = new Vuex.Store(store)

module.exports = function () {
  return new Vue({
    // Destructure the App config object, and enrich with store and hook
    ...App,
    store: applicationStore,
    el: '#sidebar'
  })
}
