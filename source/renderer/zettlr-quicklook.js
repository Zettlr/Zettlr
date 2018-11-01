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

const handlebars = require('./assets/handlebars/handlebars.runtime.js')
const { trans } = require('../common/lang/i18n.js')

// CodeMirror related includes

// 1. Mode addons
require('codemirror/addon/mode/overlay')
require('codemirror/addon/mode/multiplex') // Multiplex needed for syntax highlighting

// 2. Editing addons
require('codemirror/addon/edit/continuelist')
require('codemirror/addon/edit/closebrackets')
require('./assets/codemirror/indentlist.js')

// 3. Display addons
require('codemirror/addon/display/fullscreen')

// 4. Search addons
require('codemirror/addon/search/searchcursor')
require('codemirror/addon/scroll/annotatescrollbar')

// 5. Central modes
require('codemirror/mode/markdown/markdown')
require('codemirror/mode/gfm/gfm')
require('codemirror/mode/stex/stex')

// 6. Code highlighting modes
require('codemirror/mode/javascript/javascript')
require('codemirror/mode/clike/clike')
require('codemirror/mode/css/css')
require('codemirror/mode/php/php')
require('codemirror/mode/python/python')
require('codemirror/mode/r/r')
require('codemirror/mode/ruby/ruby')
require('codemirror/mode/sql/sql')
require('codemirror/mode/swift/swift')
require('codemirror/mode/yaml/yaml')

// Zettlr specific addons
require('./assets/codemirror/zettlr-plugin-markdown-shortcuts.js')
require('./assets/codemirror/zettlr-modes-spellchecker-zkn.js')
require('./assets/codemirror/zettlr-plugin-footnotes.js')
require('./assets/codemirror/zettlr-plugin-render-images.js')
require('./assets/codemirror/zettlr-plugin-render-links.js')
require('./assets/codemirror/zettlr-plugin-render-tasks.js')
require('./assets/codemirror/zettlr-plugin-render-iframes.js')
require('./assets/codemirror/zettlr-plugin-markdown-header-classes.js')

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
    this._body = parent
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
    let precompiled = require(`./assets/dialog-tpl/quicklook.handlebars.js`)
    // Process the template and directly call it to only return the HTML
    let qlcontent = handlebars.template(precompiled)({ 'findPlaceholder': trans('gui.find_placeholder') })
    this._window = $(qlcontent)

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

    this._window.find('.close').first().on('click', (e) => {
      e.stopPropagation()
      this.close()
    })

    this._window.find('.find').first().on('click', (e) => {
      e.stopPropagation()
      this._cm.execCommand('showFind')
    })

    this._window.find('.title').first().on('dblclick', (e) => {
      this.toggleWindow()
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
  }

  /**
    * Shows the quicklook window on screen.
    * @return {ZettlrQuicklook} Chainability.
    */
  show () {
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
    this._body.qlsplice(this) // Remove from ql-list in ZettlrBody
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

    // We need a regex because only this way we can case-insensitively search
    term = new RegExp(term, 'i')

    if (this._searchCursor.findNext()) {
      this._cm.setSelection(this._searchCursor.from(), this._searchCursor.to())
    } else {
      // Start from beginning
      this._searchCursor = this._cm.getSearchCursor(term, { 'line': 0, 'ch': 0 })
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
    this._searchCursor = this._cm.getSearchCursor(new RegExp(term, 'i'), this._cm.getCursor())
    this._currentLocalSearch = term

    // Find all matches
    let tRE = new RegExp(term, 'gi')
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
