// Here we create a module.export that, when called
// will create the Vue application for the sidebar,
// which in turn will mount itself to the #sidebar
// container.
const Vue = require('vue')
const Vuex = require('vuex')
const App = require('./sidebar.vue').default
const store = require('./store.js')

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
