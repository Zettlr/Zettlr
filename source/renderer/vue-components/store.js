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
const Vue = require('vue')
const objectToArray = require('../../common/util/object-to-array')
const findObject = require('../../common/util/find-object')

// Make the Vuex-Store the default export
module.exports = {
  state: {
    items: [],
    tags: [],
    fileList: [], // Computed property based on selectedDirectory
    searchResults: [], // Can contain search results, but mustn't
    maxWeight: 0, // Maximum weight of the search results
    fileMeta: true,
    displayTime: 'modtime',
    sidebarMode: 'thin', // Can be "thin", "expanded", or "combined"
    selectedFile: null,
    selectedDirectory: null
  },
  getters: {
    rootFiles: (state) => {
      return state.items.filter(elem => elem.type === 'file')
    },
    rootDirectories: (state) => {
      return state.items.filter(elem => elem.type !== 'file')
    },
    directoryContents: (state) => {
      return (state.searchResults.length > 0) ? state.searchResults : state.fileList
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
      // Now we need to flatten the object into an array.
      // Signature: First the object, then the attribute where the nested objects are
      state.fileList = objectToArray(dir, 'children')
    },
    sidebarMode: (state, mode) => {
      if (!['thin', 'combined', 'expanded'].includes(mode)) return
      state.sidebarMode = mode
    },
    patch: (state, opt) => {
      // Patch a full object with new properties. Adding objects works by
      // replacing the parent object (as in this way the new children list
      // will be applied to the current object).
      let obj = findObject(state.items, 'hash', opt.hash, 'children')
      let isCurrentlySelected = obj.hash === opt.hash
      obj = opt.object
      // Make sure to re-select the file, if necessary
      if (isCurrentlySelected) state.selectedFile = opt.object.hash
    },
    searchResult: (state, res) => {
      // The search results have the following structure
      // hash: <the file's hash>
      // result: Array<all results>
      // result properties: from, term, to, weight
      // So what we need to do is find the corresponding
      // file, add the results to the object and push it
      // into the searchResults-array.
      let file = findObject(state.items, 'hash', res.hash, 'children')
      // Make sure we have a corresponding file!
      if (!file) return
      let result = {}
      // Finally recalculate the maxWeight, if applicable
      let w = 0
      for (let r of res.result) { w += r.weight }

      // Commit
      // We don't need a deep copy, b/c children do not exist on files
      Object.assign(result, file, { 'results': res.result })
      state.searchResults.push(result)
      if (w > state.maxWeight) state.maxWeight = w
    },
    endSearch: (state) => {
      state.searchResults = []
      state.maxWeight = 0
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
      let isInCurrentDir = context.state.fileList.find(e => e.hash === hash)
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

        // Recompute the file list, if the file has been in the current directory.
        if (isInCurrentDir) context.commit('computeFileList')
      }
    }
  }
}
