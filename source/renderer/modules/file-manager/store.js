/**
 * BEGIN HEADER
 *
 * Contains:        Vue component function
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file holds the configuration for the global Vuex store.
 *
 * END HEADER
 */

const Vue = require('vue').default
const objectToArray = require('../../../common/util/object-to-array')
const findObject = require('../../../common/util/find-object')

// Make the Vuex-Store the default export
module.exports = {
  state: {
    items: [],
    tags: [],
    fileList: [], // Computed property based on selectedDirectory
    searchResults: [], // Can contain search results, but mustn't
    searchNoResults: false, // Will be true during resultless searches.
    maxWeight: 0, // Maximum weight of the search results
    fileMeta: true,
    useFirstHeadings: false, // If the file list should attempt to use firstHeadings
    displayTime: 'modtime',
    fileManagerMode: 'thin', // Can be "thin", "expanded", or "combined"
    selectedFile: null,
    selectedDirectory: null
  },
  getters: {
    /**
     * Returns true whenever there is any search result in the state.
     */
    activeSearch: (state) => {
      return state.searchResults.length > 0 || state.searchNoResults
    },
    rootFiles: (state) => {
      return state.items.filter(elem => elem.type === 'file')
    },
    rootDirectories: (state) => {
      return state.items.filter(elem => elem.type !== 'file')
    },
    directoryContents: (state) => {
      if (state.searchResults.length > 0) {
        // Return the search results, if there are any
        return state.searchResults
      } else if (state.fileManagerMode !== 'combined') {
        // Return the file list if not in combined mode
        return state.fileList
      } else {
        // In combined mode w/o search results, return an empty array for
        // performance purposes (we don't need to render the file list if
        // it's never visible.)
        return []
      }
    },
    currentDirectoryContent: (state) => {
      // This definitely returns the current fileList
      // (Necessary to get the directory contents in combined mode)
      return state.fileList
    },
    tags: (state) => (tags) => {
      if (!tags) return []
      if (!Array.isArray(tags)) return []
      let arr = []
      let t
      for (let tag of tags) {
        if ((t = state.tags.find(e => e.name === tag))) arr.push(t)
      }
      return arr
    }
  },
  mutations: {
    config (state, option) {
      // Set the config key, if applicable
      if (option.val === undefined) return
      if (state.hasOwnProperty(option.key)) Vue.set(state, option.key, option.val)
    },
    selectDirectory (state, hash) { state.selectedDirectory = hash },
    selectFile (state, hash) { state.selectedFile = hash },
    computeFileList (state) {
      // First we need to find the directory in our tree.
      // Signature: Tree, Property, Property value, Property to traverse
      let dir = findObject(state.items, 'hash', state.selectedDirectory, 'children')
      if (!state.selectedDirectory || !dir) {
        state.fileList = []
        return
      }

      state.fileList = objectToArray(dir, 'children')
    },
    fileManagerMode: (state, mode) => {
      state.fileManagerMode = mode
    },
    searchResult: (state, res) => {
      if (res.result.length === 0) return
      // The search results have the following structure
      // hash: <the file's hash>
      // result: Array<all results>
      // result properties: from, term, to, weight
      // So what we need to do is find the corresponding
      // file, add the results to the object and push it
      // into the searchResults-array.

      // Recalculate the maxWeight, if applicable, b/c it's the least
      // resource intensive and can cause the commit to abort.
      let w = 0
      for (let r of res.result) { w += r.weight }
      if (w === 0) return // Don't commit empty results

      let file = findObject(state.items, 'hash', res.hash, 'children')
      // Make sure we have a corresponding file!
      if (!file) return
      let result = {}

      // Commit
      // We don't need a deep copy, b/c children do not exist on files
      Object.assign(result, file, { 'results': res.result })
      state.searchResults.push(result)
      if (w > state.maxWeight) state.maxWeight = w
    },
    emptySearchResults: (state) => {
      state.searchNoResults = true
    },
    endSearch: (state) => {
      state.searchResults = []
      state.maxWeight = 0
      state.searchNoResults = false
    },
    tags: (state, tags) => {
      state.tags = tags
    }
  },
  actions: {
    selectDirectory (context, hash) {
      if (hash === context.state.selectedDirectory) return // Nothing to do
      if (hash !== context.state.selectedDirectory) context.commit('endSearch')
      context.commit('selectDirectory', hash)
      context.commit('computeFileList')
    },
    remove: function (context, hash) {
      if (!hash || !(hash instanceof Number)) return
      let obj = findObject(context.state.items, 'hash', hash, 'children')
      if (!obj) return
      // I'm not exactly sure why this happens, but while each found object
      // contains a valid reference to a given object within the main item
      // tree, the returned references somehow don't contain the children
      // arrays. So what we need to do is perform actually two searches:
      // first for the object we want to remove, then we need to retrieve
      // the parent's hash and _again_ search, now for the parent. Then we
      // can splice the object in question from the children array and
      // replace the children-property of our parent object correctly.
      if (obj.parent === null) {
        // We need to splice a root object (note that we require a
        // "parent" property to be set)
        context.state.items.splice(context.state.items.indexOf(obj), 1)
      } else {
        // Retrieve the parent
        let parent = findObject(context.state.items, 'hash', obj.parent.hash, 'children')
        if (!parent) return
        let found = parent.children.find(e => e.hash === hash)
        // Now simply splice it, the observers by Vue.js will get notified and update the view.
        parent.children.splice(parent.children.indexOf(found), 1)
      }
      // Always recompute the fileList afterwards
      context.commit('computeFileList')
    },
    patch: function (context, opt) {
      // Patch a full object with new properties. Adding objects works by
      // replacing the parent object (as in this way the new children list
      // will be applied to the current object).
      let obj = findObject(context.state.items, 'hash', opt.hash, 'children')
      let isCurrentlySelected = (obj.type === 'file') ? (context.state.selectedFile === obj.hash) : (context.state.selectedDirectory === obj.hash)
      // Explicitly set the properties of the object to make the
      // reactive parts of Vue ... well, react.
      for (let prop in opt.object) {
        if (prop === 'parent' && typeof opt.object[prop] === 'number') {
          // If we reach this point we have to duplicate the methods of
          // "recreating" the directory tree, that is, interlink the objects
          // again. In most circumstances this won't change the current parent
          // of obj, but the new hash might be used to attach obj to a
          // different parent, so we'll explicitly do this here.
          let p = findObject(context.state.items, 'hash', opt.object[prop], 'children')
          Vue.set(obj, prop, p)
        }
        Vue.set(obj, prop, opt.object[prop])
      }
      // Make sure the file list is re-computed
      context.commit('computeFileList')
      // Make sure to re-select the file or directory, if necessary
      if (isCurrentlySelected) {
        if (obj.type === 'file') context.selectedFile = obj.hash
        else context.selectedDirectory = obj.hash
      }
    },
    renewItems: function (context, newItems) {
      context.state.items = newItems
      // Commit all actions necessary after a full path update
      context.commit('computeFileList')
    }
  }
}
