/* global */
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
const MarkdownEditor = require('../renderer/modules/markdown-editor')

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
    this._findTimeout = null // Timeout to begin search after
    this._bodyHeight = 0 // Contains the height of the element, in case it was minimized
    this._searchcursor = null // The search cursor used for searching
    this._currentLocalSearch = '' // Used to not re-start a search everytime
    this._markedResults = [] // Stores marked results in case of a search
    this._scrollbarAnnotations = null // Contains an object to mark search results on the scrollbar

    this._load()

    document.getElementById('searchWhat').addEventListener('keydown', (e) => {
      const textToFind = document.getElementById('searchWhat').value
      if (e.key === 'Enter') {
        e.preventDefault()
        e.stopPropagation()
        // Search next immediately because the term is the same and the user
        // wants to cycle through the results.
        this.searchNext(textToFind)
      } else if (e.key === 'Escape') {
        document.getElementById('searchWhat').value = ''
        this.stopSearch()
      } else {
        // Set a timeout with a short delay to not make the app feel laggy
        clearTimeout(this._findTimeout)
        this._findTimeout = setTimeout(() => {
          this.searchNext(textToFind)
        }, 300) // 300ms delay
      }
    })

    window.addEventListener('keydown', (event) => {
      if (!event.metaKey && process.platform === 'darwin') return
      if (!event.ctrlKey && process.platform !== 'darwin') return

      if ([ 'f', 'F' ].includes(event.key)) {
        event.stopPropagation()
        document.getElementById('searchWhat').focus()
      }
    })

    // Finally create the annotateScrollbar object to be able to annotate the
    // scrollbar with search results.
    this._scrollbarAnnotations = this._editor.codeMirror.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }

  /**
    * Load the Quicklook template and prepare everything
    */
  _load () {
    this._editor = new MarkdownEditor(document.querySelector('textarea'), {
      // If there are images in the Quicklook file, the image renderer needs
      // the directory path of the file to correctly render the images.
      zettlr: { markdownImageBasePath: this._file.dir }
    })

    // We're fancy now, and the MarkdownEditor requires us to set a document,
    // instead of directly manipulating the value, which indeed is much cleaner.
    const mode = (this._file.ext === '.tex') ? 'stex' : 'multiplex'
    this._editor.swapDoc(CodeMirror.Doc(this._file.content, mode))

    document.querySelector('h1').textContent = this._file.name

    document.getElementById('searchWhat').setAttribute('placeholder', trans('dialog.find.find_placeholder'))
  }

  onConfigUpdate (config) {
    this._editor.setOptions({
      zettlr: {
        imagePreviewWidth: global.config.get('display.imageWidth'),
        imagePreviewHeight: global.config.get('display.imageHeight'),
        markdownBoldFormatting: global.config.get('editor.boldFormatting'),
        markdownItalicFormatting: global.config.get('editor.italicFormatting'),
        zettelkasten: global.config.get('zkn'),
        readabilityAlgorithm: global.config.get('editor.readabilityAlgorithm'),
        render: {
          citations: global.config.get('display.renderCitations'),
          iframes: global.config.get('display.renderIframes'),
          images: global.config.get('display.renderImages'),
          links: global.config.get('display.renderLinks'),
          math: global.config.get('display.renderMath'),
          tasks: global.config.get('display.renderTasks'),
          headingTags: global.config.get('display.renderHTags'),
          tables: global.config.get('editor.enableTableHelper')
        }
      }
    })
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
      this._editor.codeMirror.setSelection(this._searchCursor.from(), this._searchCursor.to())
    } else {
      // Start from beginning
      this._searchCursor = this._editor.codeMirror.getSearchCursor(makeSearchRegEx(term), { 'line': 0, 'ch': 0 })
      if (this._searchCursor.findNext()) {
        this._editor.codeMirror.setSelection(this._searchCursor.from(), this._searchCursor.to())
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
    const cursor = this._editor.codeMirror.getCursor()
    let regex = makeSearchRegEx(term)
    this._searchCursor = this._editor.codeMirror.getSearchCursor(regex, cursor)
    this._currentLocalSearch = term

    // Find all matches
    let tRE = makeSearchRegEx(term, 'gi')
    let res = []
    let match = null
    for (let i = 0; i < this._editor.codeMirror.lineCount(); i++) {
      let l = this._editor.codeMirror.getLine(i)
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
      this._markedResults.push(this._editor.codeMirror.markText(result.from, result.to, { className: 'search-result' }))
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
