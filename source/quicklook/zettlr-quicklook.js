/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrQuicklook class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls a single Quicklook window
 *
 * END HEADER
 */

const makeSearchRegEx = require('../common/util/make-search-regex')
const { trans } = require('../common/lang/i18n')

// CodeMirror related includes
// The autoloader requires all necessary CodeMirror addons and modes that are
// used by the main class. It simply folds about 70 lines of code into an extra
// file.
require('../renderer/assets/codemirror/autoload')

// Finally CodeMirror itself
const CodeMirror = require('codemirror')

/**
 * Quicklook windows are small overlay windows based on pure CSS (so that they
 * behave correctly even in fullscreen mode, where it is difficult to display
 * native modal windows per OS). They are read-only CodeMirror instances that
 * can be resized, dragged around, minimized by a double-click on the title bar
 * and make use of the necessary CodeMirror functionality, such as Searching.
 */
class ZettlrQuicklook {
  /**
    * Create a window
    * @param {ZettlrBody} parent   Calling object
    * @param {ZettlrFile} file     The file whose content should be displayed
    */
  constructor (parent, file) {
    this._parent = parent
    this._file = file
    this._cm = null
    this._window = null
    this._findTimeout = null // Timeout to begin search after
    this._bodyHeight = 0 // Contains the height of the element, in case it was minimized
    this._searchcursor = null // The search cursor used for searching
    this._currentLocalSearch = '' // Used to not re-start a search everytime
    this._markedResults = [] // Stores marked results in case of a search
    this._scrollbarAnnotations = null // Contains an object to mark search results on the scrollbar
    this._load()

    // Focus the search bar
    CodeMirror.commands.focusFind = (cm) => { this._window.find('#searchWhat').first().focus() }

    this._window.find('#searchWhat').first().on('keydown', (e) => {
      if (e.which === 13) {
        e.preventDefault()
        e.stopPropagation()
        // Search next immediately because the term is the same and the user
        // wants to cycle through the results.
        this.searchNext($('#searchWhat').val())
      } else {
        // Set a timeout with a short delay to not make the app feel laggy
        clearTimeout(this._findTimeout)
        this._findTimeout = setTimeout(() => {
          this.searchNext($('#searchWhat').val())
        }, 300) // 300ms delay
      }
    })

    // Finally create the annotateScrollbar object to be able to annotate the scrollbar with search results.
    this._scrollbarAnnotations = this._cm.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])

    // Now show the QL Window
    this.show()
  }

  /**
    * Load the Quicklook template and prepare everything
    */
  _load () {
    this._window = $('body')

    this._cm = CodeMirror.fromTextArea(this._window.find('textarea')[0], {
      readOnly: true,
      mode: 'multiplex',
      lineWrapping: true,
      extraKeys: {
        'Cmd-F': 'focusFind',
        'Ctrl-F': 'focusFind'
      },
      zkn: {
        idRE: '(\\d{14})', // What do the IDs look like?
        linkStart: '[[', // Start of links?
        linkEnd: ']]' // End of links?
      },
      theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
      cursorBlinkRate: -1 // Hide the cursor
    })

    this._window.find('h1').first().text(this._file.name)
    this._cm.setValue(this._file.content)
    // Apply heading line classes immediately
    this._cm.execCommand('markdownHeaderClasses')

    this._window.find('#searchWhat').attr('placeholder', trans('dialog.find.find_placeholder'))

    this._window.find('.close').first().on('click', (e) => {
      e.stopPropagation()
      this.close()
    })
  }

  onConfigUpdate (config) {
    this._cm.setOption('zkn', config.zkn)
    // Quote Marijn: "Resetting the mode option with setOption will trigger a full re-parse."
    // Source: https://github.com/codemirror/CodeMirror/issues/3318#issuecomment-111067281
    this._cm.setOption('mode', this._cm.getOption('mode'))
  }

  /**
    * Shows the quicklook window on screen.
    * @return {ZettlrQuicklook} Chainability.
    */
  show () {
    // Standalone windows are pretty easy.
    $('body').append(this._window)
    this._cm.refresh()
    return this
  }

  /**
    * Closes the window and destroys it.
    * @return {void} Nothing to return.
    */
  close () {
    this._window.detach()
    this._cm = null
    this._window = null
  }

  // SEARCH FUNCTIONS STOLEN FROM THE ZETTLREDITOR CLASS
  searchNext (term) {
    if (term === '') {
      // Stop search if the field is empty
      this.stopSearch()
      return
    }

    if (this._searchCursor == null || this._currentLocalSearch !== term) {
      // (Re)start search in case there was none or the term has changed
      this.startSearch(term)
    }

    if (this._searchCursor.findNext()) {
      this._cm.setSelection(this._searchCursor.from(), this._searchCursor.to())
    } else {
      // Start from beginning
      this._searchCursor = this._cm.getSearchCursor(makeSearchRegEx(term), { 'line': 0, 'ch': 0 })
      if (this._searchCursor.findNext()) {
        this._cm.setSelection(this._searchCursor.from(), this._searchCursor.to())
      }
    }
  }

  /**
    * Starts the search by preparing a search cursor we can use to forward the
    * search.
    * @param  {String} term The string to start a search for
    * @return {ZettlrEditor}      This for chainability.
    */
  startSearch (term) {
    // Create a new search cursor
    this._searchCursor = this._cm.getSearchCursor(makeSearchRegEx(term), this._cm.getCursor())
    this._currentLocalSearch = term

    // Find all matches
    let tRE = makeSearchRegEx(term, 'gi')
    let res = []
    let match = null
    for (let i = 0; i < this._cm.lineCount(); i++) {
      let l = this._cm.getLine(i)
      tRE.lastIndex = 0
      while ((match = tRE.exec(l)) != null) {
        res.push({
          'from': { 'line': i, 'ch': match.index },
          'to': { 'line': i, 'ch': match.index + term.length }
        })
      }
    }

    // Mark these in document and on the scroll bar
    this._mark(res)

    return this
  }

  /**
    * Stops the search by destroying the search cursor
    * @return {ZettlrEditor}   This for chainability.
    */
  stopSearch () {
    this._searchCursor = null
    this.unmarkResults()

    return this
  }

  // MARK FUNCTIONS ALSO STOLEN FROM ZETTLREDITOR

  /**
    * Highlights search results if any given.
    * @param {ZettlrFile} [file=this._renderer.getCurrentFile()] The file to retrieve and mark results for
    */
  markResults (file = this._renderer.getCurrentFile()) {
    if (!file) {
      return
    }

    if (this._renderer.getPreview().hasResult(file.hash)) {
      let res = this._renderer.getPreview().hasResult(file.hash).result
      this._mark(res)
    }
  }

  /**
    * Why do you have a second _mark-function, when there is markResults?
    * Because the local search also generates search results that have to be
    * marked without retrieving anything from the ZettlrPreview.
    * @param  {Array} res An Array containing all positions to be rendered.
    */
  _mark (res) {
    if (!res) {
      return
    }

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
}

module.exports = ZettlrQuicklook
