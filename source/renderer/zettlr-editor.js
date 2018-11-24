/* global $ */
/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrEditor class
* CVM-Role:        View
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     This class controls and initializes the CodeMirror editor.
*
* END HEADER
*/

const path = require('path')
const popup = require('./zettlr-popup.js')
const showdown = require('showdown')
const tippy = require('tippy.js')
const { clipboard } = require('electron')
const { generateId, hash, makeSearchRegEx } = require('../common/zettlr-helpers.js')
const { trans } = require('../common/lang/i18n.js')

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

// 7. The folding addon
require('codemirror/addon/fold/foldcode')
require('codemirror/addon/fold/foldgutter')
require('codemirror/addon/fold/brace-fold')
require('codemirror/addon/fold/indent-fold')
require('codemirror/addon/fold/markdown-fold')
require('codemirror/addon/fold/comment-fold')

// 8. Hinting (tag autocompletion, e.g.)
require('codemirror/addon/hint/show-hint')

// Zettlr specific addons
require('./assets/codemirror/zettlr-plugin-markdown-shortcuts.js')
require('./assets/codemirror/zettlr-modes-spellchecker-zkn.js')
require('./assets/codemirror/zettlr-plugin-footnotes.js')
require('./assets/codemirror/zettlr-plugin-render-images.js')
require('./assets/codemirror/zettlr-plugin-render-links.js')
require('./assets/codemirror/zettlr-plugin-render-citations.js')
require('./assets/codemirror/zettlr-plugin-render-tasks.js')
require('./assets/codemirror/zettlr-plugin-render-iframes.js')
require('./assets/codemirror/zettlr-plugin-render-math.js')
require('./assets/codemirror/zettlr-plugin-markdown-header-classes.js')

// 8. Finally CodeMirror itself
const CodeMirror = require('codemirror')

// The timeout after which a "save"-command is triggered to automatically save changes
const SAVE_TIMOUT = require('../common/data.json').poll_time
const AUTOCLOSEBRACKETS = {
  pairs: '()[]{}\'\'""»«„““”‘’__``', // Autoclose markdown specific stuff
  override: true
}

/**
* This class propably has the most `require`s in it, because it loads all
* functionality concerning the CodeMirror editor. It loads them, initializes
* the editor and then does stuff related to the editor. This class, together with
* the ZettlrDialog class is of somewhat problematic appearance because here two
* styles of programming clash: My own and the one of CodeMirror. As I have to
* hook into their API for interacting with CodeMirror you will see unusual
* functions.
*/
class ZettlrEditor {
  /**
    * Instantiate the editor
    * @param {ZettlrRenderer} parent The parent renderer element.
    */
  constructor (parent) {
    this._renderer = parent
    this._div = $('#editor')
    this._positions = [] // Saves the positions of the editor
    this._currentHash = null // Needed for positions

    this._words = 0 // Currently written words
    this._fontsize = 100 // Font size (used for zooming)
    this._timeout = null // Stores a current timeout for a save-command

    this._currentLocalSearch = '' // Saves a current local search, to re-start search on text field change
    this._markedResults = [] // Contains the search results marked in the text
    this._scrollbarAnnotations = null // Contains an object to mark search results on the scrollbar
    this._searchCursor = null // A search cursor while searching

    // The starting position for a tag autocomplete.
    this._autoCompleteStart = null
    this._tagDB = null // Holds all available tags for autocomplete
    this._citeprocIDs = null // Holds all available IDs for autocomplete
    this._currentDatabase = null // Points either to the tagDB or the ID database

    // The last array of IDs as fetched from the document
    this._lastKnownCitationCluster = []

    // All individual citations fetched during this session.
    this._citationBuffer = Object.create(null)

    this._mute = true // Should the editor mute lines while in distraction-free mode?

    // These are used for calculating a correct word count
    this._blockElements = require('../common/data.json').block_elements

    this._cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
      mode: {
        name: 'multiplex' // This will automatically pull in all other overlays
      },
      theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
      autofocus: false,
      foldGutter: true,
      gutters: ['CodeMirror-foldgutter'],
      foldOptions: {
        'widget': '\u00A0\u2026\u00A0' // nbsp ellipse nbsp
      },
      hintOptions: {
        completeSingle: false, // Don't auto-complete, even if there's only one word available
        hint: (cm, opt) => {
          let term = cm.getRange(this._autoCompleteStart, cm.getCursor())
          let completionObject = {
            'list': Object.keys(this._currentDatabase).filter(elem => elem.indexOf(term) === 0),
            'from': this._autoCompleteStart,
            'to': cm.getCursor()
          }
          // Set the autocomplete to false as soon as the user has actively selected something.
          CodeMirror.on(completionObject, 'pick', () => {
            this._autoCompleteStart = null
          })
          return completionObject
        }
      },
      lineWrapping: true,
      indentUnit: 4, // Indent lists etc. by 4, not 2 spaces (necessary, e.g., for pandoc)
      // inputStyle: "contenteditable", // Will enable this in a future version
      autoCloseBrackets: AUTOCLOSEBRACKETS,
      markdownImageBasePath: '', // The base path used to render the image in case of relative URLs
      markdownOnLinkOpen: (url) => {
        if (url[0] === '#') {
          // We should open an internal link
          let re = new RegExp('#\\s[^\\r\\n]*?' +
          url.replace(/-/g, '[^\\r\\n]+?').replace(/^#/, ''), 'i')
          // The new regex should now match the corresponding heading in the document
          for (let i = 0; i < this._cm.lineCount(); i++) {
            let line = this._cm.getLine(i)
            if (re.test(line)) {
              this.jtl(i)
              break
            }
          }
        } else {
          require('electron').shell.openExternal(url)
        }
      }, // Action for ALT-Clicks
      zkn: {
        idRE: '(\\d{14})', // What do the IDs look like?
        linkStart: '\\[\\[', // Start of links?
        linkEnd: '\\]\\]' // End of links?
      },
      extraKeys: {
        'Cmd-F': false,
        'Ctrl-F': false,
        'Enter': 'newlineAndIndentContinueMarkdownList',
        'Tab': 'autoIndentMarkdownList',
        'Shift-Tab': 'autoUnindentMarkdownList'
      }
    })

    this._cm.on('change', (cm, changeObj) => {
      // Show tag autocompletion window, if applicable (or close it)
      if (changeObj.text[0] === '#') {
        this._autoCompleteStart = JSON.parse(JSON.stringify(cm.getCursor()))
        this._currentDatabase = this._tagDB
        this._cm.showHint()
      } else if (changeObj.text[0] === '@') {
        this._autoCompleteStart = JSON.parse(JSON.stringify(cm.getCursor()))
        this._currentDatabase = this._citeprocIDs
        this._cm.showHint()
      }

      // Update wordcount
      this._renderer.updateWordCount(this.getWordCount())

      if (changeObj.origin === 'paste' && changeObj.text.join(' ').split(' ').length > 10) {
        // In case the user pasted more than ten words don't let these count towards
        // the word counter. Simply update the word count before the save function
        // is triggered. This way none of the just pasted words will count.
        this.getWrittenWords()
      }

      if (changeObj.origin !== 'setValue') {
        // If origin is setValue this means that the contents have been
        // programatically changed -> no need to flag any modification!
        this._renderer.setModified()

        // Automatically save the file each time there have been changes
        if (this._timeout) {
          clearTimeout(this._timeout)
        }
        if (this._citationTimeout) clearTimeout(this._citationTimeout)

        // This timeout can be used for everything that takes some time and
        // makes the writing feel laggy (such as generating a bunch of
        // bibliography entries.)
        this._timeout = setTimeout((e) => {
          this._renderer.saveFile()
          this.updateCitations()
        }, SAVE_TIMOUT)

        // Always run an update-citations command each time there have been changes
        this._citationTimeout = setTimeout((e) => {
          this.updateCitations()
        }, 500)
      }
    })

    // On cursor activity (not the mouse one but the text one), render all
    // things we should replace in the sense of render directly in the text
    // such as images, links, other stuff.
    this._cm.on('cursorActivity', (cm) => {
      // This event fires on either editor changes (because, obviously the
      // cursor changes its position as well then) or when the cursor moves.
      this._cm.execCommand('markdownRenderImages') // Render images
      this._cm.execCommand('markdownRenderIframes') // Render iFrames
      this._cm.execCommand('markdownRenderMath') // Render equations
      this._cm.execCommand('markdownRenderLinks') // Render links
      this._cm.execCommand('markdownRenderCitations') // Render citations
      this._cm.execCommand('markdownRenderTasks') // Render tasks
      this._cm.execCommand('markdownHeaderClasses') // Apply heading line classes
      if (this._cm.getOption('fullScreen') && this._mute) {
        this._muteLines()
      }
    })

    this._cm.on('drop', (cm, event) => {
      if (event.dataTransfer.files.length > 0) {
        // In case of files being dropped, do *not* let CodeMirror handle them.
        event.codemirrorIgnore = true
        let imagesToInsert = []
        for (let x of event.dataTransfer.files) {
          if (/(jpg|jpeg|png|gif|svg|tiff|tif)$/i.test(x.path)) {
            imagesToInsert.push(x.path)
          }
        }
        if (imagesToInsert.length > 0) {
          let where = this._cm.coordsChar({ 'left': event.clientX, 'top': event.clientY })
          // Don't let Zettlr handle this because opening something Additionally
          // to images would be weird.
          event.stopPropagation()
          event.preventDefault()

          // Add all images.
          this._cm.setCursor(where)
          let str = '\n'
          for (let p of imagesToInsert) {
            str += `![${p.substr(p.lastIndexOf('/') + 1)}](${p})\n`
          }
          this._cm.replaceSelection(str)
        }
      }
    })

    // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
    this._cm.on('renderLine', (cm, line, elt) => {
      let charWidth = cm.defaultCharWidth() + 3
      let basePadding = 4
      // Show continued list/qoute lines aligned to start of text rather
      // than first non-space char.  MINOR BUG: also does this inside
      // literal blocks.
      let leadingSpaceListBulletsQuotes = /^\s*([*+-]\s+|\d+\.\s+|>\s*)*/
      let leading = (leadingSpaceListBulletsQuotes.exec(line.text) || [''])[0]
      let off = CodeMirror.countColumn(leading, leading.length, cm.getOption('tabSize')) * charWidth

      elt.style.textIndent = '-' + off + 'px'
      elt.style.paddingLeft = (basePadding + off) + 'px'
    })

    // Display a footnote if the target is a link (and begins with ^)
    this._cm.getWrapperElement().addEventListener('mousemove', (e) => {
      let t = $(e.target)
      if (t.hasClass('cm-link') && t.text().indexOf('^') === 0) {
        this._fntooltip(t)
      }
    })

    this._cm.getWrapperElement().addEventListener('click', (e) => {
      if (!e.altKey) { // Such links open on ALT-Click (b/c CodeMirror handles Ctrl+Cmd)
        return true // Stop handling event.
      }
      e.preventDefault()

      let elem = $(e.target)
      if (elem.hasClass('cm-zkn-tag')) {
        // The user clicked a zkn link -> create a search
        this._renderer.autoSearch(elem.text())
      } else if (elem.hasClass('cm-zkn-link')) {
        this._renderer.autoSearch(elem.text().replace(/[[\]]/g, ''), true)
      } else if (elem.hasClass('cm-link') && elem.text().indexOf('^') === 0) {
        // We've got a footnote
        this._editFootnote(elem)
      }
    })

    this._cm.refresh()

    // Enable resizing of the editor
    this.enableResizable()
    // Update resize options on window resize
    window.addEventListener('resize', (e) => {
      if (this._div.hasClass('fullscreen')) return // Don't handle
      this._div.resizable('option', 'minWidth', Math.round($(window).width() * 0.4))
      this._div.resizable('option', 'maxWidth', Math.round($(window).width() * 0.9))

      // Also we have to resize the editor to the correct width again
      $('#editor').css('width', $(window).innerWidth() - $('#combiner').outerWidth() + 'px')
    })

    // Finally create the annotateScrollbar object to be able to annotate the scrollbar with search results.
    this._scrollbarAnnotations = this._cm.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }
  // END constructor

  /**
    * Opens a file, i.e. replaced the editor's content
    * @param  {ZettlrFile} file The file to be renderer
    * @return {ZettlrEditor}      Chainability.
    */
  open (file) {
    this._cm.setValue(file.content)
    this._cm.setOption('markdownImageBasePath', path.dirname(file.path)) // Set the base path for image rendering

    // Switch modes based on the file type
    if (file.ext === '.tex') {
      this._cm.setOption('mode', 'stex')
      $('.CodeMirror').addClass('cm-stex-mode')
    } else if (this._cm.getOption('mode') === 'stex') {
      this._cm.setOption('mode', 'multiplex')
      $('.CodeMirror').removeClass('cm-stex-mode')
    }

    this._cm.refresh()
    // Scroll the scrollbar to top, to make sure it's at the top of the new
    // file (in case there are positions saved, they will be scrolled to
    // later in this function)
    $('.CodeMirror-vscrollbar').scrollTop(0)
    this._currentHash = 'hash' + file.hash
    this._words = this.getWordCount()

    // Mark clean, because now we got a new (and therefore unmodified) file
    this._cm.markClean()
    this._cm.clearHistory() // Clear history so that no "old" files can be
    // recreated using Cmd/Ctrl+Z.

    if (this._positions[this._currentHash] !== undefined) {
      // Restore scroll positions
      this._cm.scrollIntoView(this._positions[this._currentHash].scroll)
      this._cm.setSelection(this._positions[this._currentHash].cursor)
    }

    // Last but not least: If there are any search results currently
    // display, mark the respective positions.
    this.markResults(file)

    // Finally, set a timeout for a first run of citation rendering
    setTimeout(() => { this.updateCitations() }, 1000)

    return this
  }

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

  /**
    * Closes the current file.
    * @return {ZettlrEditor} Chainability.
    */
  close () {
    // Save current positions in case the file is being opened again later.
    if (this._currentHash != null) {
      this._positions[this._currentHash] = {
        'scroll': JSON.parse(JSON.stringify(this._cm.getScrollInfo())),
        'cursor': JSON.parse(JSON.stringify(this._cm.getCursor()))
      }
    }

    this._cm.setValue('')
    this._cm.markClean()
    this._cm.clearHistory()
    this._words = 0
    this._cm.setOption('markdownImageBasePath', '') // Reset base path
    return this
  }

  /**
    * Toggles the distraction free mode
    */
  toggleDistractionFree () {
    this._cm.setOption('fullScreen', !this._cm.getOption('fullScreen'))
    if (!this._cm.getOption('fullScreen')) {
      this._unmuteLines()
      this._div.removeClass('fullscreen')
      this.enableResizable()
    } else {
      if (this._mute) this._muteLines()
      this._div.addClass('fullscreen')
      this.disableResizable()
    }

    // Refresh to reflect the size changes
    this._cm.refresh()
  }

  /**
    * Sets the variable that controls the muting of lines
    * @param {Boolean} state True or false, depending on whether or not we should mute the lines in distraction free mode
    */
  setMuteLines (state) {
    this._mute = state
    if (this._cm.getOption('fullScreen') && !this._mute) {
      this._unmuteLines() // Unmute
    } else if (this._cm.getOption('fullScreen') && this._mute) {
      this._muteLines() // Mute
    }
  }

  /**
   * Sets the autoCloseBrackets command of the editor to the respective value.
   * @param {Boolean} state True, if brackets should be autoclosed, or false.
   */
  setAutoCloseBrackets (state) {
    if (state) {
      this._cm.setOption('autoCloseBrackets', AUTOCLOSEBRACKETS)
    } else {
      this._cm.setOption('autoCloseBrackets', false)
    }
  }

  /**
   * Apply constraints to the preview image size
   * @param {number} width  The maximum width
   * @param {number} height The maximum height
   */
  setImagePreviewConstraints (width, height) {
    this._cm.setOption('imagePreviewWidth', width)
    this._cm.setOption('imagePreviewHeight', height)
  }

  /**
   * This sets the tag database necessary for the tag autocomplete.
   * @param {Object} tagDB An object (here with prototype due to JSON) containing tags
   */
  setTagDatabase (tagDB) { this._tagDB = tagDB }

  /**
   * Sets the citeprocIDs available to autocomplete to a new list
   * @param {Array} idList An array containing the new IDs
   */
  setCiteprocIDs (idList) {
    if (typeof idList !== 'object' || idList === null) {
      // Create an empty object.
      this._citeprocIDs = Object.create(null)
    } else {
      // Overwrite existing array
      this._citeprocIDs = idList
    }
  }

  /**
    * Removes the mute-class from all lines
    */
  _unmuteLines () {
    for (let i = 0; i < this._cm.lineCount(); i++) {
      this._cm.doc.removeLineClass(i, 'text', 'mute')
    }
  }

  /**
    * Adds the mute-class to all lines except where the cursor is at.
    */
  _muteLines () {
    this._unmuteLines()
    let highlightLine = this._cm.getCursor().line
    for (let i = 0; i < this._cm.lineCount(); i++) {
      if (highlightLine !== i) {
        this._cm.doc.addLineClass(i, 'text', 'mute')
      }
    }
  }

  /**
    * Returns the current word count in the editor.
    * @param {String} [words=this._cm.getValue()] The string to be counted
    * @return {Integer} The word count.
    */
  getWordCount (words = this._cm.getValue()) {
    if (words === '') return 0

    words = words.split(/[\s ]+/)

    let i = 0

    // Remove block elements from word count to get a more accurate count.
    while (i < words.length) {
      if (this._blockElements.includes(words[i])) {
        words.splice(i, 1)
      } else {
        i++
      }
    }

    return words.length
  }

  /**
    * Returns an object containing info about the opened file.
    * @return {Objet} An object containing words, chars, chars_wo_spaces, if selection: words_sel and chars_sel
    */
  getFileInfo () {
    let ret = {
      'words': this.getWordCount(),
      'chars': this._cm.getValue().length,
      'chars_wo_spaces': this._cm.getValue().replace(/[\s ]+/g, '').length
    }

    if (this._cm.somethingSelected()) {
      ret.words_sel = this.getWordCount(this._cm.getSelections().join(' '))
      ret.chars_sel = this._cm.getSelections().join('').length
    }

    return ret
  }

  /**
    * Returns the (newly) written words since the last time this function was
    * called.
    * @return {Integer} The delta of the word count.
    */
  getWrittenWords () {
    // Return the additional written words
    let nbr = this.getWordCount() - this._words
    this._words = this.getWordCount()
    return nbr
  }

  /**
    * Selects a word that is under the current cursor.
    * Currently, this function is only called by the context menu class to
    * select a word. This function only selects the word if nothing else is
    * selected (to not fuck up some copy action someone tried to do)
    * @return {void} Nothing to return.
    */
  selectWordUnderCursor () {
    // Don't overwrite selections.
    if (this._cm.somethingSelected()) {
      return
    }

    let cur = this._cm.getCursor()
    let sel = this._cm.findWordAt(cur)
    this._cm.setSelection(sel.anchor, sel.head)
  }

  /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
  replaceWord (word) {
    if (!this._cm.somethingSelected()) {
      // We obviously need a selection to replace
      return
    }

    // Replace word and select new word
    this._cm.replaceSelection(word, 'around')
  }

  /**
     * Inserts a new ID at the current cursor position
     */
  insertId () {
    if (!this._cm.somethingSelected()) {
    // Don't replace selections
      this._cm.replaceSelection(generateId(this._cm.getOption('zkn').idGen))
      this._cm.focus()
    } else {
      // Save and afterwards retain the selections
      let sel = this._cm.doc.listSelections()
      this._cm.setCursor({
        'line': this._cm.doc.lastLine(),
        'ch': this._cm.doc.getLine(this._cm.doc.lastLine()).length
      })
      this._cm.replaceSelection('\n\n' + generateId(this._cm.getOption('zkn').idGen)) // Insert at the end of document
      this._cm.doc.setSelections(sel)
    }
  }

  /**
    * Displays the footnote content for a given footnote (element)
    * @param  {jQuery} element The footnote element
    * @return {void}         Nothing to return.
    */
  _fntooltip (element) {
    // First let us see if there is already a tippy-instance bound to this.
    // If so, we can abort now.
    if (element[0].hasOwnProperty('_tippy') && element[0]._tippy) {
      return
    }

    // Because we highlight the formatting as well, the element's text will
    // only contain ^<id> without the brackets
    let fn = element.text().substr(1)
    let fnref = ''

    // Now find the respective line and extract the footnote content using
    // our RegEx from the footnotes plugin.
    let fnrefRE = /^\[\^([\da-zA-Z_-]+)\]: (.+)/gm

    for (let lineNo = this._cm.doc.lastLine(); lineNo > -1; lineNo--) {
      fnrefRE.lastIndex = 0
      let line = this._cm.doc.getLine(lineNo)
      let match = null
      if (((match = fnrefRE.exec(line)) != null) && (match[1] === fn)) {
        fnref = match[2]
        break
      }
    }

    // Now we either got a match or an empty fnref. So create a tippy
    // instance
    tippy.one(element[0], {
      'content': (fnref && fnref !== '') ? fnref : 'no reference text',
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
      'performance': true,
      flip: true,
      arrow: true
    }).show() // Immediately show the tooltip
  }

  /**
    * This displays a small popup to allow editing the text from within the text, without the need to scroll.
    * @param  {jQuery} elem The (jQuery) encapsulated footnote reference.
    */
  _editFootnote (elem) {
    let ref = elem.text().substr(1)
    let line = null
    this._cm.eachLine((handle) => {
      if (handle.text.indexOf(`[^${ref}]:`) === 0) {
        // Got the line
        line = handle
      }
    })

    let cnt = `<div class="footnote-edit">`
    cnt += `<textarea id="footnote-edit-textarea">${line.text.substr(5 + ref.length)}</textarea>`
    cnt += '</div>'

    let p = popup(elem, cnt)

    // Focus the textarea immediately.
    $('#footnote-edit-textarea').focus()

    $('.popup .footnote-edit').on('keydown', (e) => {
      if (e.which === 13 && e.shiftKey) {
        // Done editing.
        e.preventDefault()
        let newtext = `[^${ref}]: ${e.target.value}`
        let sc = this._cm.getSearchCursor(line.text, { 'line': 0, 'ch': 0 })
        sc.findNext()
        sc.replace(newtext)
        p.close()
      }
    })
  }

  /**
    * This function builds a table of contents based on the editor contents
    * @return {Array} An array containing objects with all headings
    */
  buildTOC () {
    let toc = []
    for (let i = 0; i < this._cm.lineCount(); i++) {
      // Don't include comments from code examples in the TOC
      if (this._cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      let line = this._cm.getLine(i)
      if (/^#{1,6} /.test(line)) {
        toc.push({
          'line': i,
          'text': line.replace(/^#{1,6} /, ''),
          'level': (line.match(/^(#+)/) || [[], []])[1].length
        })
      }
    }

    return toc
  }

  /**
    * Small function that jumps to a specific line in the editor.
    * @param  {Integer} line The line to pull into view
    * @return {void}      No return.
    */
  jtl (line) {
    // Wow. Such magic.
    this._cm.doc.setCursor({ 'line': line, 'ch': 0 })
    this._cm.refresh()
  }

  /**
    * Alter the font size of the editor.
    * @param  {Integer} direction The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
    * @return {ZettlrEditor}           Chainability.
    */
  zoom (direction) {
    if (direction === 0) {
      this._fontsize = 100
    } else {
      this._fontsize = this._fontsize + 10 * direction
    }
    this._div.css('font-size', this._fontsize + '%')
    this._cm.refresh()
    return this
  }

  /**
    * Find the next occurrence of a given term
    * @param  {String} [term] The term to search for
    */
  searchNext (term) {
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
    // First transform the term based upon what the user has entered
    this._currentLocalSearch = term
    // Create a new search cursor
    this._searchCursor = this._cm.getSearchCursor(makeSearchRegEx(term), this._cm.getCursor())

    // Find all matches
    // For this single instance we need a global modifier
    let tRE = makeSearchRegEx(term, 'gi')
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

  /**
    * Replace the next occurrence with 'replacement'
    * @param  {String} replacement The string with which the next occurrence of the search cursor term will be replaced
    * @return {Boolean} Whether or not a string has been replaced.
    */
  replaceNext (replacement) {
    if (this._searchCursor != null) {
      this._searchCursor.replace(replacement)
      return true
    }
    return false
  }

  /**
    * Replace all occurrences of a given string with a given replacement
    * @param  {String} searchWhat  The string to be searched for
    * @param  {String} replaceWhat Replace with this string
    */
  replaceAll (searchWhat, replaceWhat) {
    searchWhat = makeSearchRegEx(searchWhat)
    // First select all matches
    let ranges = []
    let cur = this._cm.getSearchCursor(searchWhat, { 'line': 0, 'ch': 0 })
    while (cur.findNext()) { ranges.push({ 'anchor': cur.from(), 'head': cur.to() }) }
    if (ranges.length) this._cm.setSelections(ranges, 0)
    // Create a new array with the same size as all selections
    let repl = new Array(this._cm.getSelections().length)
    // Fill it with the replace value (to replace every single selection with
    // the same term)
    repl = repl.fill(replaceWhat)
    // Aaaand do it
    this._cm.replaceSelections(repl)
  }

  /**
    * This function copies text as HTML, if there are selections
    * @return {ZettlrEditor} This (chainabiltiy)
    */
  copyAsHTML () {
    if (this._cm.somethingSelected()) {
      let md = this._cm.getSelections().join(' ')
      let conv = new showdown.Converter()
      conv.setFlavor('github')
      let html = conv.makeHtml(md)
      clipboard.writeHTML(html)
    }
    return this
  }

  /**
   * Enables the resizable between editor and sidebar.
   * @return {void} Does not return.
   */
  enableResizable () {
    // Make preview and editor resizable
    this._div.resizable({
      'handles': 'w',
      'resize': (e, ui) => {
        // We need to account for the 10 pixels padding in the editor somehow.
        $('#combiner').css('width', ($(window).width() - ui.size.width - 10) + 'px')
        this._div.css('width', '')
      },
      'stop': (e, ui) => {
        this._renderer.getEditor().refresh() // Refresh the editor to update lines and cursor positions.
        $('body').css('cursor', '') // Why does jQueryUI ALWAYS do this to me?
        this._div.css('width', '')
      },
      'minWidth': Math.round($(window).width() * 0.4),
      'maxWidth': Math.round($(window).width() * 0.9)
    })
  }

  /**
   * Disables the resizing functionality between the sidebar and the editor.
   * @return {void} This function does not return.
   */
  disableResizable () {
    $('#editor').resizable('destroy')
    $('#editor').prop('style', '') // Remove the left and width things
    $('#combiner').prop('style', '')
    // TODO save these variables!
  }

  /**
   * This method updates both the in-text citations as well as the bibliography.
   * @return {void} Does not return.
   */
  updateCitations () {
    // This function searches for all elements with class .citeproc-citation and
    // updates the contents of these elements based upon the ID.

    // NEVER use jQuery to always query all citeproc-citations, because CodeMirror
    // does NOT always print them! We have to manually go through the value of
    // the code ...
    let cnt = this._cm.getValue()
    let totalIDs = Object.create(null)
    let match
    let citeprocIDRE = /@([a-z0-9_:.#$%&\-+?<>~/]+)/gi
    let somethingUpdated = false // This flag indicates if anything has changed and justifies a new bibliography.
    let needRefresh = false // Do we need to refresh CodeMirror?
    while ((match = citeprocIDRE.exec(cnt)) != null) {
      let id = match[1]
      totalIDs[id] = this._lastKnownCitationCluster[id] // Could be undefined.
    }

    // Now we have the correct amount of IDs in our cluster. Now fetch all
    // citations of new ones.
    for (let id in totalIDs) {
      if (totalIDs[id] === undefined) {
        totalIDs[id] = true
        somethingUpdated = true // We have to fetch a new citation
      }
    }

    // Check if there are some citations _missing_ from the new array
    for (let id in this._lastKnownCitationCluster) {
      if (totalIDs[id] === undefined) {
        somethingUpdated = true // We only need one entry to justify an update
        break
      }
    }

    // Swap
    this._lastKnownCitationCluster = totalIDs

    // Now everything is set -> Go through all rendered spans and update if
    // necessary
    let elements = $('.CodeMirror .citeproc-citation')
    elements.each((index, elem) => {
      elem = $(elem)
      if (elem.attr('data-rendered') !== 'yes') {
        let item = elem.attr('data-citeproc-cite-item')
        let id = hash(item)
        item = JSON.parse(item)
        if (this._citationBuffer[id] !== undefined) {
          elem.html(this._citationBuffer[id]).removeClass('error').attr('data-rendered', 'yes')
          needRefresh = true
        } else {
          let newCite = global.citeproc.getCitation(item)
          if (newCite !== 4) { // 4 is the number assigned to READY state of citeproc
            elem.html(newCite).removeClass('error').attr('data-rendered', 'yes')
            this._citationBuffer[id] = newCite
            needRefresh = true
          } else if (newCite === false || newCite === 3) { // 3 means error in the engine
            elem.addClass('error')
          } // else: Engine wasn't ready yet
        }
      }
    })

    if (Object.keys(this._lastKnownCitationCluster).length === 0) {
      return this._renderer.setBibliography(trans('gui.citeproc.references_none'))
    }

    if (somethingUpdated) {
      // Need to update
      // We need to update the items first!
      let bib = global.citeproc.updateItems(Object.keys(this._lastKnownCitationCluster))
      if (bib === true) {
        global.citeproc.makeBibliography() // Trigger a new bibliography build
      } else if (bib === 1) { // 1 means booting
        this._renderer.setBibliography(trans('gui.citeproc.references_booting'))
        // Unset so that the update process is triggered again next time
        this._lastKnownCitationCluster = Object.create(null)
      } else if (bib === 3) { // There was an error
        this._renderer.setBibliography(trans('gui.citeproc.references_error'))
      } else if (bib === 2) { // No database loaded
        this._renderer.setBibliography(trans('gui.citeproc.no_db'))
      }
    }

    // We need to refresh the editor, because the updating process has certainly
    // altered the widths of the spans.
    if (needRefresh) this._cm.refresh()
  }

  /**
   * Returns the current value of the editor.
   * @return {String} The current editor contents.
   */
  getValue () { return this._cm.getValue() }

  /**
    * Mark clean the CodeMirror instance
    * @return {void} Nothing to return.
    */
  markClean () { this._cm.markClean() }

  /**
    * Query if the editor is currently modified
    * @return {Boolean} True, if there are no changes, false, if there are.
    */
  isClean () { return this._cm.doc.isClean() }

  /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
  runCommand (cmd) {
    let sel = this._cm.doc.listSelections()
    let oldCur = JSON.parse(JSON.stringify(this._cm.getCursor()))
    this._cm.execCommand(cmd)

    if (sel.length > 0) {
      this._cm.doc.setSelections(sel)
    }

    if (cmd === 'insertFootnote') {
      // In case the user inserted a footnote, we have to re-set the cursor
      // for ease of access.
      oldCur.ch += 2 // This sets the cursor inside, so the user has a visual on where to ALT-Click
      this._cm.setCursor(oldCur)
    }
  }

  /**
    * Focus the CodeMirror instance
    */
  focus () { this._cm.focus() }

  /**
    * Refresh the CodeMirror instance
    */
  refresh () { this._cm.refresh() }

  /**
   * Get the CodeMirror instance
   * @return {CodeMirror} The editor instance
   */
  getEditor () { return this._cm }
}

module.exports = ZettlrEditor
