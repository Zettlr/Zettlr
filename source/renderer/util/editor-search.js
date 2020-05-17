/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        EditorSearch class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the search bound to the CodeMirror instance.
 *
 * END HEADER
 */

const makeSearchRegEx = require('../../common/util/make-search-regex')

class EditorSearch {
  constructor (cm) {
    this._cm = cm // Save the editor's instance

    // Saves a current local search, to re-start search on text field change
    this._currentLocalSearch = ''
    // Contains the search results marked in the text
    this._markedResults = []
    // Contains an object to mark search results on the scrollbar
    this._scrollbarAnnotations = null
    // A search cursor used while searching
    this._searchCursor = null
    // Holds the last search result. Necessary for capturing groups in regular expressions
    this._lastSearchResult = null

    if (this._cm) this.initAnnotations()

    /**
     * Inject global functions to help with searching.
     * @type {Object}
     */
    global.editorSearch = {
      'next': (term) => { return this.searchNext(term) },
      'replaceNext': (repl) => { return this.replaceNext(repl) },
      'replaceAll': (search, replace) => { this.replaceAll(search, replace) },
      'stop': () => { this.stopSearch() },
      'hasSearch': () => { return this._searchCursor !== null },
      'markResults': (file) => { this.markResults(file) },
      'unmarkResults': () => { this.unmarkResults() },
      /**
       * Utility function that lets you highlight a certain search term without
       * triggering a full search (helpful for marking certain occurrences within
       * the document).
       */
      'highlightOccurrences': (term) => { this._highlightSearchResults(term) }
    }
  }

  /**
   * Sets the CodeMirror instance after creation.
   * @param {CodeMirror} cm The editor instance.
   */
  setInstance (cm) {
    this._cm = cm
    this.initAnnotations()
  }

  /**
   * Initiates the annotations on the scrollbar.
   */
  initAnnotations () {
    this._scrollbarAnnotations = this._cm.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }

  /**
    * Highlights the given search results in the file.
    * @param {ZettlrFile} file The file for which to find results.
    */
  markResults (file) {
    let results = global.store.getSearchResults()
    if (file && results.length > 0) {
      // Find the results and display them.
      // The results are merged with the file.
      let res = results.find(e => e.hash === file.hash)
      if (res) this._mark(res.results)
    }
  }

  /**
    * Why do you have a second _mark-function, when there is markResults?
    * Because the local search also generates search results that have to be
    * marked without retrieving anything from the ZettlrPreview.
    * @param  {Array} res An Array containing all positions to be rendered.
    */
  _mark (res) {
    if (!res) return

    this.unmarkResults() // Clear potential previous marks
    let sbannotate = []
    for (let result of res) {
      if (!result.from || !result.to) {
        // One of these was undefined. And somehow this if-clause has made
        // searching approximately three times faster. Crazy.
        continue
      }
      sbannotate.push({ 'from': result.from, 'to': result.to })
      this._markedResults.push(this._cm.markText(result.from, result.to, { className: 'search-result' }))
    }

    this._scrollbarAnnotations.update(sbannotate)
  }

  /**
    * Removes all marked search results
    */
  unmarkResults () {
    // Simply remove all markers
    for (let mark of this._markedResults) {
      mark.clear()
    }

    this._scrollbarAnnotations.update([])
    this._markedResults = []
  }

  /**
    * Find the next occurrence of a given term
    * @param  {String} [term = this._currentLocalSearch] The term to search for
    * @return {Boolean} Whether or not the term has been found.
    */
  searchNext (term = this._currentLocalSearch) {
    if (!term) return // There must be something so search for.
    if (this._searchCursor == null || this._currentLocalSearch !== term) {
      // (Re)start search in case there was none or the term has changed
      this.stopSearch()
      this.startSearch(term)
    }

    this._lastSearchResult = this._searchCursor.findNext()

    if (!this._lastSearchResult) {
      // If nothing was found, it may be that we just have reached the end
      // of the document. Let's check that. If nothing is found in the
      // whole document, we'll know.
      this._cm.setCursor({ 'line': 0, 'ch': 0 })
      this.startSearch(this._currentLocalSearch)
      // Return the status so that the caller may
      // know whether or not something was found.
      this._lastSearchResult = this._searchCursor.findNext()
    }

    // Select the search result in any case
    if (this._lastSearchResult) this._cm.setSelection(this._searchCursor.from(), this._searchCursor.to())
    if (!this._lastSearchResult) this.stopSearch() // Stop the whole search in case nothing was found
    return this._lastSearchResult
  }

  /**
    * Starts the search by preparing a search cursor we can use to forward the
    * search.
    * @param  {String} term The string to start a search for
    * @return {ZettlrEditor}      This for chainability.
    */
  startSearch (term) {
    // First transform the term based upon what the user has entered
    this._currentLocalSearch = term
    // Create a new search cursor
    this._searchCursor = this._cm.getSearchCursor(makeSearchRegEx(term), this._cm.getCursor())

    // Highlight the search results
    this._highlightSearchResults()

    return this
  }

  /**
    * Stops the search by destroying the search cursor
    * @return {ZettlrEditor}   This for chainability.
    */
  stopSearch () {
    this._searchCursor = null
    this.unmarkResults()
    this._currentLocalSearch = null
    this._lastSearchResult = null

    return this
  }

  /**
    * Replace the next occurrence with 'replacement'
    * @param  {String} replacement The string with which the next occurrence of the search cursor term will be replaced
    * @return {Boolean} Whether or not a string has been replaced.
    */
  replaceNext (replacement) {
    if (this._searchCursor) {
      // First we need to check whether or not there have been capturing groups
      // within the search result. If so, replace each variable with one of the
      // matched groups from the last found search result. Do this globally for
      // multiple occurrences.
      for (let i = 1; i < this._lastSearchResult.length; i++) {
        replacement = replacement.replace(new RegExp('\\$' + i, 'g'), this._lastSearchResult[i])
      }
      this._searchCursor.replace(replacement)
      // Highlight the next search result
      this._highlightSearchResults()
      return this.searchNext()
    }
    return false
  }

  /**
    * Replace all occurrences of a given string with a given replacement
    * @param  {String} searchWhat  The string to be searched for
    * @param  {String} replaceWhat Replace with this string
    */
  replaceAll (searchWhat, replaceWhat) {
    // First select all matches
    let ranges = []
    let replacements = []
    let res
    let cur = this._cm.getSearchCursor(makeSearchRegEx(searchWhat), { 'line': 0, 'ch': 0 })
    while ((res = cur.findNext()) !== false) {
      // First push the match to the ranges to be replaced
      ranges.push({ 'anchor': cur.from(), 'head': cur.to() })
      // Also make sure to replace variables in the replaceWhat, if applicable
      if (res.length < 2) {
        replacements.push(replaceWhat)
      } else {
        let repl = replaceWhat
        for (let i = 1; i < res.length; i++) {
          repl = repl.replace(new RegExp('\\$' + i, 'g'), res[i])
        }
        replacements.push(repl)
      }
    }

    // Aaaand do it
    this._cm.setSelections(ranges, 0)
    this._cm.replaceSelections(replacements)

    this.unmarkResults() // Nothing to show afterwards.
  }

  /**
   * This highlights the current search results both on the scrollbar and
   * in the text. This is necessary, because replacing something removes
   * some of the text markers, so we have to restore them.
   */
  _highlightSearchResults (highlightWhat = this._currentLocalSearch) {
    this.unmarkResults()
    if (!highlightWhat) return // Nothing to highlight
    // Find all matches
    // For this single instance we need a global modifier
    let tRE = makeSearchRegEx(highlightWhat, 'g')
    let res = []
    let match = null
    for (let i = 0; i < this._cm.lineCount(); i++) {
      let l = this._cm.getLine(i)
      tRE.lastIndex = 0
      while ((match = tRE.exec(l)) != null) {
        res.push({
          'from': { 'line': i, 'ch': match.index },
          'to': { 'line': i, 'ch': match.index + match[0].length }
        })
      }
    }

    // Mark these in document and on the scroll bar
    this._mark(res)
  }
}

module.exports = EditorSearch
