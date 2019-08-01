/**
 * BEGIN HEADER
 *
 * Contains:        ZettlrStore class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class acts as an interface between the store and the NodeJS environment
 *
 * END HEADER
 */

const StoreConfig = require('./vue-components/store.js')
const Vuex = require('vuex')

class ZettlrStore {
  constructor (parent) {
    this._app = parent
    this._store = new Vuex.Store(StoreConfig)

    global.store = {
      set: (key, val) => {
        this._store.commit('config', { 'key': key, 'val': val })
      },
      selectDirectory: (newDir) => {
        this._store.dispatch('selectDirectory', newDir)
      },
      patch: (oldHash, newObject) => {
        this._store.commit('patch', { 'hash': oldHash, 'object': newObject })
      }
    }
  }

  /**
   * Returns a reference to the internal Vuex object
   * @return {Vuex} The store reference
   */
  getVuex () { return this._store }
}

module.exports = ZettlrStore
