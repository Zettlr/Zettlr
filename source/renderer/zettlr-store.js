/**
 * BEGIN HEADER
 *
 * Contains:        ZettlrStore class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class acts as an interface between
 *                  the store and the NodeJS environment.
 *
 * END HEADER
 */

class ZettlrStore {
  constructor (parent, store) {
    this._app = parent
    this._store = store

    global.store = {
      set: (key, val) => {
        this._store.commit('config', { 'key': key, 'val': val })
      },
      selectDirectory: (newDir) => {
        this._store.dispatch('selectDirectory', newDir)
      },
      patch: (oldHash, newObject) => {
        this._store.dispatch('patch', { 'hash': oldHash, 'object': newObject })
      },
      commitSearchResult: (res) => {
        this._store.commit('searchResult', res)
      },
      renewItems: (newItems) => {
        this._store.dispatch('renewItems', newItems)
      },
      commitEndSearch: () => { this._store.commit('endSearch') },
      emptySearchResult: () => { this._store.commit('emptySearchResults') },
      getSearchResults: () => { return this._store.state.searchResults }
    }
  }

  /**
   * Returns a reference to the internal Vuex object
   * @return {Vuex} The store reference
   */
  getVuex () { return this._store }
}

module.exports = ZettlrStore
