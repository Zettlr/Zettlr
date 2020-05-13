/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GlobalSearch class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the global search functionality.
 *
 * END HEADER
 */

const compileSearchTerms = require('../../common/util/compile-search-terms')

class GlobalSearch {
  constructor (term) {
    let compiledTerms = compileSearchTerms(term)

    // Now we are all set and can begin the journey. First we need to prepare
    // some things. First: Write the current terms into this object
    // second, listen for search events and third clear everything up when
    // we are done.

    this._elements = []
    this._currentSearch = compiledTerms
    this._beforeSearchCallback = null
    this._afterSearchCallback = null

    this._interrupt = false // If this flag is set, the doSearch function will break

    // The search index will be increased BEFORE accessing the first file!
    this._currentSearchIndex = -1

    // Also, to prevent previous search results from showing up, remove them
    this._results = []
    this._maxWeight = -1
  }

  /**
   * Adds elements to the searchable array
   * @param  {Array} elements An array with new items
   * @return {GlobalSearch}   This for chainability
   */
  with (elements) {
    if (!Array.isArray(elements)) elements = [elements]
    this._elements = this._elements.concat(elements)
    return this
  }

  /**
   * Define a callback to be called for each element
   * @param  {Function} callback The callback to be called.
   * @return {GlobalSearch}            This for chainability
   */
  each (callback) {
    this._beforeSearchCallback = callback
    return this
  }

  /**
   * Adds a callback to be called after each search result has been processed.
   * @param  {Function} callback The provided callback
   * @return {GlobalSearch}            This for chainability.
   */
  afterEach (callback) {
    this._afterSearchCallback = callback
    return this
  }

  /**
   * Adds a callback to be called after the search is completed.
   * @param  {Function} callback The provided callback.
   * @return {GlobalSearch}            This for chainability.
   */
  then (callback) {
    this._afterCallback = callback
    return this
  }

  /**
   * Begins a search (if it has been correctly set up)
   * @return {GlobalSearch} This for chainability
   */
  start () {
    if (!this._currentSearch) throw new Error('Search not initialised!')
    // Aaaaand: Go!
    this._doSearch()

    return this
  }

  /**
    * Do one single search cycle.
    * @return {void} Nothing to return.
    */
  _doSearch () {
    if (this._elements.length === 0) {
      this.endSearch()
      return
    }

    if (this._currentSearchIndex >= (this._elements.length - 1)) {
      // End search
      this.endSearch()
      return
    }

    if (this._interrupt) return // An interrupt will prematurely break searching

    this._currentSearchIndex++

    // Now call the provided callback and handle the search result once it
    // arrives.
    this._beforeSearchCallback(
      this._elements[this._currentSearchIndex],
      this._currentSearch
    ).then((data) => {
      this.handleSearchResult(data)
    })
  }

  /**
    * Handle the result of the search from main process.
    * @param  {Object} res Contains the search result and the hash.
    * @return {void}     Nothing to return.
    */
  handleSearchResult (res) {
    if (this._interrupt) return // An interrupt will prematurely break searching

    if (res.result.length > 0) {
      this._results.push(res) // For later reference
      let w = 0
      for (let r of res.result) {
        w += r.weight
      }
      if (w > this._maxWeight) {
        this._maxWeight = w
      }
    }

    // If provided, call the appropriate callback
    if (this._afterSearchCallback) this._afterSearchCallback(this._currentSearchIndex, this._elements.length)

    // Next search cycle
    this._doSearch()
  }

  /**
    * Ends a search if there are no more elements to search through.
    * @return {void} Nothing to return.
    */
  endSearch () {
    this._currentSearchIndex = 0
    this._elements = []
    this._currentSearch = null

    if (this._afterCallback) this._afterCallback(this._results)
  }

  /**
   * Sets the interrupt flag if called in order to break a running search.
   */
  setInterrupt () {
    this._interrupt = true
  }
}

module.exports = GlobalSearch
