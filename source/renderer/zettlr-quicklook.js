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

const makeTemplate = require('../common/zettlr-template.js')
const { makeSearchRegEx } = require('../common/zettlr-helpers.js')
const { trans } = require('../common/lang/i18n.js')

// CodeMirror related includes
// The autoloader requires all necessary CodeMirror addons and modes that are
// used by the main class. It simply folds about 70 lines of code into an extra
// file.
require('./assets/codemirror/autoload.js')

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
  constructor (parent, file, standalone = false) {
    this._parent = parent
    this._file = file
    this._standalone = standalone
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
    if (this._standalone) {
      this._window = $('body')
    } else {
      // Process the template and directly call it to only return the HTML
      let qlcontent = makeTemplate('other', 'quicklook')
      this._window = $(qlcontent)
    }

    this._cm = CodeMirror.fromTextArea(this._window.find('textarea')[0], {
      readOnly: true,
      mode: 'multiplex',
      lineWrapping: true,
      extraKeys: {
        'Cmd-F': 'focusFind',
        'Ctrl-F': 'focusFind'
      },
      theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
      cursorBlinkRate: -1 // Hide the cursor
    })

    this._window.find('h1').first().text(this._file.name)
    this._cm.setValue(this._file.content)
    // Apply heading line classes immediately
    this._cm.execCommand('markdownHeaderClasses')

    if (!this._standalone) {
      this._makeOverlayWindow()
    }

    this._window.find('#searchWhat').attr('placeholder', trans('dialog.find.find_placeholder'))

    this._window.find('.close').first().on('click', (e) => {
      e.stopPropagation()
      this.close()
    })
  }

  /**
    * Shows the quicklook window on screen.
    * @return {ZettlrQuicklook} Chainability.
    */
  show () {
    // Standalone windows are pretty easy.
    if (this._standalone) {
      $('body').append(this._window)
      this._cm.refresh()
      return this
    }
    let height = $(window).height()
    let width = $(window).width()
    let qlh = height * 0.66 // Two thirds of screen
    let qlw = width * 0.5

    // Take care of minimum sizes
    if (qlh < 400) {
      qlh = 400
    }
    if (qlw < 400) {
      qlw = 400
    }

    // Somehow the draggable() plugin thinks it's best to set the position
    // to relative, which then causes the second window to be positioned
    // NOT where it should but directly beneath the first QL-Window
    // (respectively its original place before it was moved).
    this._window.css('position', 'fixed')

    // Set dimensions and positions
    this._window.css('width', qlw)
    this._window.css('height', qlh)
    this._window.css('top', height / 2 - qlh / 2)
    this._window.css('left', width / 2 - qlw / 2)

    // Append (e.g., show) and set the body to a correct size and give the
    // CM a first refresh
    $('body').append(this._window)
    this._window.find('.body').css(
      'height',
      (qlh - this._window.find('.title').outerHeight()) + 'px'
    )
    this._cm.refresh()
    return this
  }

  /**
   * Makes a quicklook window an overlay
   * @return {void} No return.
   */
  _makeOverlayWindow () {
    // Draggable stuff and resizing is only necessary for not-standalone windows.
    let toolbarheight = $('#toolbar').outerHeight()

    this._window.draggable({
      handle: 'div.title',
      containment: 'document',
      cursor: '-webkit-grabbing',
      stack: '.quicklook',
      drag: (e, ui) => {
        if (ui.position.top < toolbarheight) {
          ui.position.top = toolbarheight
        }
      },
      stop: (e, ui) => {
        this._cm.focus()
      }
    })

    this._window.resizable({
      handles: 'e, se, s, sw, w',
      containment: 'document',
      minHeight: 400,
      minWidth: 400,
      resize: (e, ui) => {
        let bar = this._window.find('.title')
        this._window.find('.body').css('height', (ui.size.height - bar.outerHeight()) + 'px')
        this._cm.refresh()
      },
      stop: (e, ui) => {
        // Refresh the editor to account for changes in the size.
        this._cm.refresh()
        this._cm.focus()
      }
    })

    // Bring quicklook window to front on click on the title
    this._window.find('.title').first().on('click', (e) => {
      let max
      let group = $('.quicklook')

      if (group.length < 1) return
      max = parseInt(group[0].style.zIndex, 10) || 0
      $(group).each(function (i) {
        if (parseInt(this.style.zIndex, 10) > max) {
          max = parseInt(this.style.zIndex, 10)
        }
      })

      this._window.css({ 'zIndex': max + 1 })
    })

    this._window.find('.title').first().on('dblclick', (e) => {
      this.toggleWindow()
    })

    // Activate the event listener to pop-out this window
    this._window.find('.make-standalone').first().on('click', (e) => {
      global.ipc.send('make-standalone', this._file.hash, (ret) => {
        // If the new window was successfully opened, close this one.
        if (ret) this.close()
      })
    })
  }

  /**
    * Displays visibility of the window's body.
    * @return {ZettlrQuicklook} Chainability.
    */
  toggleWindow () {
    if (this._window.hasClass('minimize')) {
      // Restore
      this._window.removeClass('minimize')
      this._window.css('height', this._bodyHeight)
      let bar = this._window.find('.title')
      this._window.resizable('enable')
      this._window.find('.body').css(
        'height',
        (parseFloat(this._bodyHeight) - bar.outerHeight()) + 'px'
      )
      this._window.find('.CodeMirror').css('display', 'block')
      this._cm.refresh()
    } else {
      // Minimize
      this._window.addClass('minimize')
      this._bodyHeight = this._window.css('height')
      this._window.find('.body').css('height', '0px')
      this._window.resizable('disable')
      this._window.css('height', '')
      this._window.find('.CodeMirror').css('display', 'none')
    }

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
    this._parent.qlsplice(this) // Remove from ql-list in ZettlrBody
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
