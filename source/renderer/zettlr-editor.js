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
const hash = require('../common/util/hash')
const popup = require('./zettlr-popup.js')
const showdown = require('showdown')
const Turndown = require('joplin-turndown')
const countWords = require('../common/util/count-words')
const EditorTabs = require('./util/editor-tabs')
const turndownGfm = require('joplin-turndown-plugin-gfm')
const moveSection = require('./util/editor-move-section')
const EditorSearch = require('./util/editor-search')
const { clipboard } = require('electron')
const generateKeymap = require('./assets/codemirror/generate-keymap.js')
const openMarkdownLink = require('./util/open-markdown-link')
const EditorAutocomplete = require('./util/editor-autocomplete')

// The autoloader requires all necessary CodeMirror addons and modes that are
// used by the main class. It simply folds about 70 lines of code into an extra
// file.
require('./assets/codemirror/autoload.js')

// Finally load CodeMirror itself
const CodeMirror = require('codemirror')

// The timeout after which a "save"-command is triggered to automatically save changes
const SAVE_TIMOUT = require('../common/data.json').poll_time
const AUTOCLOSEBRACKETS = {
  pairs: '()[]{}\'\'""__``', // Autoclose markdown specific stuff
  override: true
}

const IMAGE_REGEX = /(jpg|jpeg|png|gif|svg|tiff|tif)$/i

const MD_MODE = { name: 'multiplex' }
const TEX_MODE = { name: 'stex' }

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
    this._openFiles = [] // Holds all open files in the editor
    this._currentHash = null // Needed for positions

    this._words = 0 // Currently written words
    this._fontsize = 100 // Font size (used for zooming)
    this._timeout = null // Stores a current timeout for a save-command

    this._searcher = new EditorSearch(null)
    this._tabs = new EditorTabs()
    // The user can select or close documents on the tab bar
    this._tabs.setIntentCallback(this._onTabAction.bind(this))

    this._autocomplete = new EditorAutocomplete()

    // What elements should be rendered?
    this._renderCitations = false
    this._renderIframes = false
    this._renderImages = false
    this._renderLinks = false
    this._renderMath = false
    this._renderTasks = false
    this._renderHTags = false
    this._wysiwyg = false // TODO TESTING
    this._renderTables = false

    // Remembers the last mode when entering readability
    this._lastMode = MD_MODE // Default mode

    this._countChars = false // Whether or not Zettlr should count characters as words (e.g., for Chinese)

    // This Markdown to HTML converter is used in various parts of the
    // class to perform converting operations.
    this._showdown = new showdown.Converter()
    this._showdown.setFlavor('github')
    this._showdown.setOption('strikethrough', true)
    this._showdown.setOption('tables', true)
    this._showdown.setOption('omitExtraWLInCodeBlocks', true)
    this._showdown.setOption('tasklists', true)
    this._showdown.setOption('requireSpaceBeforeHeadingText', true)

    // HTML to Markdown conversion is better done with Turndown.
    this._turndown = new Turndown({
      headingStyle: 'atx',
      hr: '---'
    })
    this._turndown.use(turndownGfm.gfm)

    // All individual citations fetched during this session.
    this._citationBuffer = Object.create(null)

    // Should the editor mute lines while in distraction-free mode?
    this._mute = true
    // Caches the "left" style property during distraction free
    this._leftBeforeDistractionFree = ''

    this._cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
      mode: MD_MODE,
      theme: 'zettlr', // We don't actually use the cm-s-zettlr class, but this way we prevent the default theme from overriding.
      autofocus: false,
      autoCorrect: false, // Default to false to keep this thing clean
      foldGutter: true,
      cursorScrollMargin: 60, // Keep the cursor 60px below/above editor edges
      cursorBlinkRate: 0, // Disable cursor blinking (we'll do this with a @keyframes animation)
      gutters: ['CodeMirror-foldgutter'],
      foldOptions: {
        'widget': '\u00A0\u2026\u00A0' // nbsp ellipse nbsp
      },
      placeholder: ' ', // Just an invisible space.
      hintOptions: {
        completeSingle: false, // Don't auto-complete, even if there's only one word available
        hint: (cm, opt) => { return this._autocomplete.hint(cm, opt) }
      },
      lineWrapping: true,
      indentUnit: 4, // Indent lists etc. by 4, not 2 spaces (necessary, e.g., for pandoc)
      // inputStyle: "contenteditable", // Will enable this in a future version
      autoCloseBrackets: AUTOCLOSEBRACKETS,
      markdownImageBasePath: '', // The base path used to render the image in case of relative URLs
      markdownBoldFormatting: '**', // The characters used for bold
      markdownItalicFormatting: '_', // The characters used for italic
      markdownOnLinkOpen: (url) => { return openMarkdownLink(url, this) }, // Action for ALT-Clicks
      zkn: {
        idRE: '(\\d{14})', // What do the IDs look like?
        linkStart: '[[', // Start of links?
        linkEnd: ']]' // End of links?
      },
      continuelistModes: [ 'markdown', 'markdown-zkn' ],
      extraKeys: generateKeymap(this)
    })

    // Set up the helper classes with the CM instance
    this._searcher.setInstance(this._cm)
    this._autocomplete.init(this._cm)

    /**
     * Listen to the beforeChange event to modify pasted image paths into real
     * markdown images.
     * @type {function}
     */
    this._cm.on('beforeChange', (cm, changeObj) => {
      // Tap into pasting
      if (changeObj.origin === 'paste') {
        // First check if there's an image in the clipboard. In this case we
        // need to cancel the paste event and handle the image ourselves.
        let image = clipboard.readImage()
        let html = clipboard.readHTML()
        let plain = clipboard.readText()
        let explicitPaste = plain === changeObj.text.join('\n')

        if (!image.isEmpty() && (explicitPaste || !changeObj.text)) {
          // We've got an image. So we need to handle it.
          this._renderer.handleEvent('paste-image')
          return changeObj.cancel() // Cancel handling of the event
        }

        // Next possibility: There's HTML formatted text in the clipboard. In
        // this case we'll be sneaky and simply exchange the plain text with
        // the Markdown formatted version. We need an additional check to make
        // sure the HTML version is indeed different than the plain text
        // version, as some apps may write the same plain text stuff into the
        // HTML part of the clipboard, in which case dragging it through the
        // converter will result in unwanted behaviour (including Electron).
        // We have the problem that CodeMirror treats moving text around and
        // dropping links exactly the same as explicitly hitting Cmd/Ctrl+V.
        // The only way we can be sure is to make sure the changeObject is the
        // same as the plain text from the clipboard. ONLY in this instance
        // is it a regular, explicit paste. Else the text in the changeObject
        // takes precedence.
        if (html && html.length > 0 && (!plain || html !== plain) && explicitPaste) {
          // We've got HTML, so let's fire up Turndown.
          plain = this._turndown.turndown(html)
          // Let's update the (very likely plain) HTML text with some Markdown
          // that retains the formatting. PLEASE NOTE that we have to split the
          // resulting string as the update method expects an Array of lines,
          // not a complete string with line breaks.
          return changeObj.update(changeObj.from, changeObj.to, plain.split('\n'))
        }
      }
    })

    this._cm.on('change', (cm, changeObj) => {
      let newText = changeObj.text

      if (changeObj.origin === 'paste' && newText.join(' ').split(' ').length > 10) {
        // In case the user pasted more than ten words don't let these count towards
        // the word counter. Simply update the word count before the save function
        // is triggered. This way none of the just pasted words will count.
        this.getWrittenWords()
      }

      if (changeObj.origin !== 'setValue') {
        // If origin is setValue this means that the contents have been
        // programatically changed -> no need to flag any modification!
        // Clear the timeouts in any case
        if (this._timeout) clearTimeout(this._timeout)
        if (this._citationTimeout) clearTimeout(this._citationTimeout)

        // Check if the change actually modified the doc or not.
        if (this._cm.doc.isClean()) {
          this._renderer.clearModified(this._currentHash)
          // NOTE in case you notice we're either calling this.markClean or
          // this._tabs.markDirty, this is because on markClean we also have to
          // mark the document as clean (in another case it's called
          // programmatically), but if we mark the tabs dirty, the doc IS dirty.
          this.markClean(this._currentHash)
        } else {
          this._renderer.setModified(this._currentHash)
          this._tabs.markDirty(this._currentHash)
          // Set the autosave timeout
          this._timeout = setTimeout((e) => {
            // NOTE that the renderer will pull the currently active file from
            // the editor in any case, so the state is maintained.
            this._renderer.saveFile()
          }, SAVE_TIMOUT)
        }
      }
    })

    // On cursor activity (not the mouse one but the text one), render all
    // things we should replace in the sense of render directly in the text
    // such as images, links, other stuff.
    this._cm.on('cursorActivity', (cm) => {
      // This event fires on either editor changes (because, obviously the
      // cursor changes its position as well then) or when the cursor moves.
      this._fireRenderers()
    })

    // We need to update citations also on updates, as this is the moment when
    // new spans get added to the DOM which we might have to render.
    this._cm.on('update', (cm) => {
      this.renderCitations()
      // Must be called to ensure all tables have active event listeners.
      if (this._renderTables) this._cm.execCommand('markdownInitiateTables')
    })

    this._cm.on('drop', (cm, event) => {
      if (event.dataTransfer.files.length > 0) {
        // In case of files being dropped, do *not* let CodeMirror handle them.
        event.codemirrorIgnore = true
        let imagesToInsert = []
        for (let x of event.dataTransfer.files) {
          if (IMAGE_REGEX.test(x.path)) {
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
      let charWidth = cm.defaultCharWidth() - 2
      let basePadding = 4
      // Show continued list/qoute lines aligned to start of text rather
      // than first non-space char.  MINOR BUG: also does this inside
      // literal blocks.
      let leadingSpaceListBulletsQuotes = /^\s*([*+-]\s+|\d+\.\s+|>\s*)+/ // NOTE: Replaced the last * with +
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
      // Open links on both Alt and Ctrl clicks - otherwise stop handling event
      if (!(e.altKey || e.ctrlKey)) return true

      e.preventDefault()

      let elem = $(e.target)
      if (elem.hasClass('cm-zkn-tag')) {
        // The user clicked a zkn link -> create a search
        this._renderer.autoSearch(elem.text())
      } else if (elem.hasClass('cm-zkn-link')) {
        this._renderer.autoSearch(elem.text(), true)
      } else if (elem.hasClass('cm-link') && elem.text().indexOf('^') === 0) {
        // We've got a footnote
        this._editFootnote(elem)
      }
    })

    this._cm.getWrapperElement().addEventListener('paste', (e) => {
      let image = clipboard.readImage()
      // Trigger the insertion process from here only if there is no text in the
      // clipboard (because then CodeMirror will not do anything). If there is
      // text in the clipboard, do not try to trigger the process from here
      // because this way two dialogs would be opened -- first from the
      // beforeChange handler of CodeMirror, and, after the event has bubbled
      // to the wrapper, from here.
      if (!image.isEmpty() && clipboard.readText().length === 0) {
        // We've got an image. So we need to handle it.
        this._renderer.handleEvent('paste-image')
      }
    })

    this._cm.refresh()

    // Finally create the annotateScrollbar object to be able to annotate the
    // scrollbar with search results.
    this._scrollbarAnnotations = this._cm.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }
  // END constructor

  /**
   * Apply all renderers and other fancy stuff on the editor.
   */
  _fireRenderers () {
    if (this._renderImages) this._cm.execCommand('markdownRenderImages') // Render images
    this._cm.execCommand('markdownRenderMermaid') // Render mermaid codeblocks
    if (this._renderIframes) this._cm.execCommand('markdownRenderIframes') // Render iFrames
    if (this._renderMath) this._cm.execCommand('markdownRenderMath') // Render equations
    if (this._renderLinks) this._cm.execCommand('markdownRenderLinks') // Render links
    if (this._renderCitations) this._cm.execCommand('markdownRenderCitations') // Render citations
    if (this._renderTables) this._cm.execCommand('markdownRenderTables') // Render tables
    if (this._renderTasks) this._cm.execCommand('markdownRenderTasks') // Render tasks
    if (this._renderHTags) this._cm.execCommand('markdownRenderHTags') // Render heading levels
    if (this._wysiwyg) this._cm.execCommand('markdownWYSIWYG') // Render all other elements
    this._cm.execCommand('markdownHeaderClasses') // Apply heading line classes
    this._cm.execCommand('markdownCodeblockClasses') // Apply code block classes
    if (this._cm.getOption('fullScreen') && this._mute) this._muteLines()

    // Additionally, render all citations that may have been newly added to
    // the DOM by CodeMirror.
    this.renderCitations()

    // Update fileInfo
    this._renderer.updateFileInfo(this.getFileInfo())
  }

  /**
   * Enters the readability mode
   */
  enterReadability () {
    this._lastMode = this._cm.getOption('mode')
    this._cm.setOption('mode', {
      name: 'readability',
      algorithm: global.config.get('editor.readabilityAlgorithm')
    })
    this._cm.refresh()
  }

  /**
   * Exits the readability mode.
   */
  exitReadability () {
    this._cm.setOption('mode', this._lastMode)
    this._cm.refresh()
  }

  /**
   * Returns whether or not the editor is currently in readability mode
   * @return {Boolean} Whether or not readability mode is active.
   */
  isReadabilityModeActive () {
    let mode = this._cm.getOption('mode')
    if (!mode) return false // Before a doc has been loaded, mode can be undefined
    return mode.hasOwnProperty('name') && mode.name === 'readability'
  }

  /**
   * Toggles the readability mode on or off, depending on its state.
   */
  toggleReadability () {
    if (this.isReadabilityModeActive()) {
      this.exitReadability()
    } else {
      this.enterReadability()
    }
  }

  /**
    * Opens a file, i.e. replaced the editor's content
    * @param  {ZettlrFile}   file The file to be renderer
    * @param  {Mixed}        flag An optional flag
    * @return {ZettlrEditor}       Chainability.
    */
  open (file, flag = null) {
    if (!this._openFiles.find(elem => elem.fileObject.hash === file.hash)) {
      console.log('File not opened. Adding to open files ...')
      // We need to create a new doc for the file and then swap
      // the currently active doc.
      // Switch modes based on the file type
      let mode = MD_MODE
      // Potentially helpful: $('.CodeMirror').addClass('cm-stex-mode')
      if (file.ext === '.tex') mode = TEX_MODE

      // Bind the "correct" filetree object to the doc, because
      // we won't be accessing the content property at all, hence
      // it's easier to have the file object bound here that all
      // of the renderer is working with.
      let fileTreeObject = this._renderer.findObject(file.hash)
      this._openFiles.push({
        'fileObject': fileTreeObject,
        'cmDoc': CodeMirror.Doc(file.content, mode)
      })
    }

    // I know that I will make this mistake in the future, so here's why we
    // don't swap the file.content property during this: Because there's a
    // different function to do so. Use it! Don't monkey path _swapFiles. NO
    // content replacement here!
    this._swapFile(file.hash)

    // If we've got a new file, we need to re-focus the editor
    if (flag === 'new-file') this._cm.focus()

    return this
  }

  /**
   * Exchanges the current document displayed.
   * @param {Number} hash The hash of the file to be swapped
   */
  _swapFile (hash) {
    if (this.isReadabilityModeActive()) this.exitReadability()
    // Exchanges the CodeMirror document object
    let file = this._openFiles.find(elem => elem.fileObject.hash === hash)
    if (!file) {
      console.log('No file found to swap.')
      return
    }
    // swapDoc returns the old doc, but we retain a reference in the
    // _openFiles array so we don't need to catch it.
    this._cm.swapDoc(file.cmDoc)
    this._currentHash = hash
    this._cm.setOption('markdownImageBasePath', path.dirname(file.fileObject.path))

    // Reset the word count to match the now active file
    this._words = countWords(this._cm.getValue(), this._countChars)

    // Synchronise the file changes to the document tabs
    this._tabs.syncFiles(this._openFiles, this._currentHash)

    // Make sure all headings are rendered etc. pp
    this._fireRenderers()

    // We also need to tell the autocompletion to rebuild the index
    this.signalUpdateFileAutocomplete()

    this._renderer.signalActiveFileChanged()

    // Last but not least: If there are any search results currently
    // display, mark the respective positions.
    this._searcher.markResults(file.fileObject)

    // The sidebar needs to be informed that the active file has changed!
    global.store.set('selectedFile', this._currentHash)
    // Same for the main process
    global.ipc.send('set-active-file', { 'hash': this._currentHash })
  }

  /**
   * Synchronises a list of hashes with the open documents in the editor.
   * @param {Array} newHashes A potential new list of hashes to open/sync.
   */
  syncFiles (newHashes = this._openFiles.map(elem => elem.fileObject.hash)) {
    let oldHashes = this._openFiles.map(elem => elem.fileObject.hash)
    let lastHashIndex = oldHashes.indexOf(this._currentHash)
    if (lastHashIndex > newHashes.length) lastHashIndex = newHashes.length - 1

    // First, close all files no longer present.
    for (let fileDescriptor of this._openFiles) {
      if (!newHashes.includes(fileDescriptor.fileObject.hash)) {
        this.close(fileDescriptor.fileObject.hash)
      }
    }

    // Then, determine all files we have yet to open anew.
    let toOpen = newHashes.filter(fileHash => !oldHashes.includes(fileHash))
    if (toOpen.length > 0) {
      for (let fileHash of toOpen) {
        global.ipc.send('file-request-sync', { 'hash': fileHash })
      }
    }

    // New tags mean we might have potential new file matches --> signal this
    // to the autocompletion.
    this.signalUpdateFileAutocomplete()

    // Last but not least, exchange the current hash, if not present anymore.
    // We'll use the same index for that, because, purely from a visual
    // perspective, it makes absolutely sense that the new active file is at
    // roughly the same position than the former one.
    if (!newHashes.includes(this._currentHash)) {
      // In this case, we also need to swap files
      this._swapFile(newHashes[lastHashIndex])
    }

    // Finally, propagate the changes to the tabs.
    this._tabs.syncFiles(this._openFiles, this._currentHash)
  }

  /**
   * Handles the callback intent whenever the user performs an action
   * on the tabs.
   *
   * @param {( string|number )} hash The hash upon which the intent was triggered.
   * @param {string} intent The actual intent.
   * @memberof ZettlrEditor
   */
  _onTabAction (hash, intent) {
    // Make sure === works as intended
    if (!Array.isArray(hash)) hash = parseInt(hash, 10)
    if (intent === 'close') {
      // Send the close request to main
      global.ipc.send('file-close', { 'hash': hash })
    } else if (intent === 'select') {
      this._swapFile(hash)
    } else if (intent === 'new-file') {
      // Tell the renderer someone wants a new file
      this._renderer.newFile('new-file-button')
    } else if (intent === 'sorting') {
      // hash is actually an array, with all hashes in their desired new sorting,
      // so let's forward that to main. But also make sure we sort it here
      // because otherwise the new sorting won't be persisted in the tabbar.
      this._openFiles = hash.map(e => this._openFiles.find(file => file.fileObject.hash === e))
      global.ipc.send('sort-open-files', hash)
    }
  }

  /**
   * Silently adds a file to the array of open files.
   * @param {Object} fileObject A file descriptor with content
   */
  addFileToOpen (fileObject) {
    console.log('addFileToOpen called')
    // Check if the file is already open; prevent duplicates.
    if (this._openFiles.find(elem => elem.fileObject.hash === fileObject.hash)) return
    // This function is called by the IPC when there's a new file
    // synchronisation request answered by main. Let's simply push it to the
    // array of open files without touching any other logic.
    let fileTreeObject = this._renderer.findObject(fileObject.hash)
    let mode = MD_MODE
    if (fileObject.ext === '.tex') mode = TEX_MODE
    this._openFiles.push({
      'fileObject': fileTreeObject,
      'cmDoc': CodeMirror.Doc(fileObject.content, mode)
    })

    // If there's no file open, open this one.
    if (!this._currentHash) this._swapFile(fileObject.hash)

    // Propagate changes
    this._tabs.syncFiles(this._openFiles, this._currentHash)
  }

  /**
   * Hot-swaps the contents of one of the currently opened files.
   * @param {number} hash The file's hash
   * @param {string} contents The new file contents
   * @memberof ZettlrEditor
   */
  replaceFileContents (hash, contents) {
    let openedFile = this._openFiles.find((e) => e.fileObject.hash === hash)
    if (openedFile) {
      openedFile.cmDoc.setValue(contents)
      // Now mark clean this one document using the function, which also takes
      // care to instruct main to remove the edit flag if applicable.
      this.markClean(openedFile.fileObject.hash)
    } else {
      console.warn('Cannot replace the file contents of file ' + hash + ': No open file found!')
    }
  }

  /**
    * Closes the current file.
    * @param {Number} hash A hash to close
    * @return {ZettlrEditor} Chainability.
    */
  close (hash) {
    if (!hash) return console.error('Could not close file: No hash provided!')

    let fileToClose = this._openFiles.find(elem => elem.fileObject.hash === hash)
    if (!fileToClose) return console.error('Could not close file: Not open.')
    let currentIndex = this._openFiles.indexOf(fileToClose)

    // Splice it
    this._openFiles.splice(currentIndex, 1)

    if (this._openFiles.length === 0) {
      // Replace with an empty new doc
      this._cm.swapDoc(CodeMirror.Doc('', MD_MODE))
      this._words = 0
      this._currentHash = null
      this._cm.setOption('markdownImageBasePath', '') // Reset base path
      this.signalUpdateFileAutocomplete() // Autocomplete with no file match
    }

    if (this._currentHash === fileToClose.fileObject.hash && this._openFiles.length > 0) {
      // The current file has been closed: Select another one
      if (currentIndex > 0) {
        this._swapFile(this._openFiles[currentIndex - 1].fileObject.hash)
      } else {
        this._swapFile(this._openFiles[0].fileObject.hash)
      }
    }

    // Synchronise the file changes to the document tabs
    this._tabs.syncFiles(this._openFiles, this._currentHash)

    return this
  }

  /**
   * Attempts to close an open tab, and returns true if it did.
   * @returns {boolean} True, if a tab has been closed, otherwise false.
   */
  attemptCloseTab () {
    if (this._openFiles.length === 0) return false

    if (!this._currentHash) return false

    // Send the close request to main
    global.ipc.send('file-close', { 'hash': this._currentHash })

    // Indicate that we have indeed been able to close a tab
    return true
  }

  /**
   * Tab switcher functions
   */
  selectNextTab () { this._tabs.selectNext() }
  selectPrevTab () { this._tabs.selectPrevious() }

  /**
   * Returns the file that is active (i.e. visible), but only the object, NOT the doc
   */
  getActiveFile () {
    let activeFile = this._openFiles.find(elem => elem.fileObject.hash === this._currentHash)
    return (activeFile) ? activeFile.fileObject : undefined
  }

  /**
    * Toggles the distraction free mode
    */
  toggleDistractionFree () {
    this._cm.setOption('fullScreen', !this._cm.getOption('fullScreen'))
    if (!this._cm.getOption('fullScreen')) {
      this._unmuteLines()
      this._div.removeClass('fullscreen')
      this._div.css('left', this._leftBeforeDistractionFree)
    } else {
      if (this._mute) this._muteLines()
      this._div.addClass('fullscreen')
      this._leftBeforeDistractionFree = this._div.css('left')
      if (this._leftBeforeDistractionFree === '0px') this._leftBeforeDistractionFree = ''
      this._div.css('left', '') // Remove the "left" property
    }

    // We have to re-apply the font-size to the editor because this style gets
    // overwritten by one of the above operations.
    if (this._fontsize !== 100) this._div.css('font-size', this._fontsize + '%')

    // Refresh to reflect the size changes
    this._cm.refresh()
  }

  /**
   * Gets called by the Renderer everytime the configuration changes so that the
   * editor can reload all defaults
   * @return {ZettlrEditor} Chainability
   */
  configChange () {
    // The configuration has changed, so reload everything

    // Re-generate the keymap
    this._cm.setOption('extraKeys', generateKeymap(this))

    // Should lines be muted in distraction free?
    this._mute = global.config.get('muteLines')
    if (this._cm.getOption('fullScreen') && !this._mute) {
      this._unmuteLines() // Unmute
    } else if (this._cm.getOption('fullScreen') && this._mute) {
      this._muteLines() // Mute
    }

    // Set the autoCloseBrackets option
    if (global.config.get('editor.autoCloseBrackets')) {
      this._cm.setOption('autoCloseBrackets', AUTOCLOSEBRACKETS)
    } else {
      this._cm.setOption('autoCloseBrackets', false)
    }

    // Set the image dimension constraints
    this._cm.setOption('imagePreviewWidth', global.config.get('display.imageWidth'))
    this._cm.setOption('imagePreviewHeight', global.config.get('display.imageHeight'))

    // Set indent unit
    this._cm.setOption('indentUnit', global.config.get('editor.indentUnit'))

    // Set the bold and italic formatting characters
    this._cm.setOption('markdownBoldFormatting', global.config.get('editor.boldFormatting'))
    this._cm.setOption('markdownItalicFormatting', global.config.get('editor.italicFormatting'))

    // Set the preview options
    this._renderCitations = global.config.get('display.renderCitations')
    this._renderIframes = global.config.get('display.renderIframes')
    this._renderImages = global.config.get('display.renderImages')
    this._renderLinks = global.config.get('display.renderLinks')
    this._renderMath = global.config.get('display.renderMath')
    this._renderTasks = global.config.get('display.renderTasks')
    this._renderHTags = global.config.get('display.renderHTags')
    this._renderTables = global.config.get('editor.enableTableHelper')

    this._countChars = global.config.get('editor.countChars')

    // Set the autoCorrect options
    let conf = global.config.get('editor.autoCorrect')
    if (!conf.active) {
      this._cm.setOption('autoCorrect', false)
    } else {
      // Convert the replacements into the correct format for the plugin
      let keys = {}
      for (let repl of conf.replacements) {
        keys[repl.key] = repl.val
      }
      this._cm.setOption('autoCorrect', {
        style: conf.style,
        quotes: conf.quotes,
        replacements: keys
      })
    }

    // Check for RTL-support
    this._cm.setOption('direction', global.config.get('editor.direction'))
    this._cm.setOption('rtlMoveVisually', global.config.get('editor.rtlMoveVisually'))

    // Last but not least set the Zettelkasten options
    this._cm.setOption('zkn', global.config.get('zkn'))

    // Fire the renderers in order to apply potential changed styles and settings
    this._fireRenderers()

    return this
  }

  /**
   * This sets the tag database necessary for the tag autocomplete.
   * @param {Object} tagDB An object (here with prototype due to JSON) containing tags
   */
  setTagDatabase (tagDB) { this._autocomplete.setTagCompletion(tagDB) }

  /**
   * Sets the citeprocIDs available to autocomplete to a new list
   * @param {Array} idList An array containing the new IDs
   */
  setCiteprocIDs (idList) { this._autocomplete.setCiteKeyCompletion(idList) }

  /**
   * Signals an update to the autocompletion to update its internal file
   * database.
   */
  signalUpdateFileAutocomplete () {
    this._autocomplete.setFileCompletion(
      this._renderer.getCurrentDir(),
      this._renderer.matchFile(this._currentHash)
    )
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
    * Returns an object containing info about the opened file.
    * @return {Object} An object containing words, chars, chars_wo_spaces, if selection: words_sel and chars_sel
    */
  getFileInfo () {
    let currentValue = this._cm.getValue()
    let ret = {
      'words': countWords(currentValue, this._countChars),
      'chars': currentValue.length,
      'chars_wo_spaces': currentValue.replace(/[\s ]+/g, '').length,
      'cursor': JSON.parse(JSON.stringify(this._cm.getCursor()))
    }

    if (this._cm.somethingSelected()) {
      ret.words_sel = countWords(this._cm.getSelections().join(' '), this._countChars)
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
    let nbr = countWords(this._cm.getValue(), this._countChars) - this._words
    this._words = countWords(this._cm.getValue(), this._countChars)
    return nbr
  }

  /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
  replaceWord (word) {
    // We obviously need a selection to replace
    if (!this._cm.somethingSelected()) return

    // Replace word and select new word
    this._cm.replaceSelection(word, 'around')
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

    // TODO translate this message!
    fnref = (fnref && fnref !== '') ? fnref : '_No reference text_'

    // For preview we should convert the footnote text to HTML.
    fnref = this._showdown.makeHtml(fnref)

    // Now we either got a match or an empty fnref. So create a tippy
    // instance
    global.tippy(element[0], {
      'content': fnref,
      allowHTML: true,
      onHidden (instance) {
        instance.destroy() // Destroy the tippy instance.
      },
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

    let cnt = '<div class="footnote-edit">'
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
      if (this._cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
      let line = this._cm.getLine(i)
      if (/^#{1,6} /.test(line)) {
        toc.push({
          'line': i,
          'text': line.replace(/^#{1,6} /, ''),
          'level': (line.match(/^(#+)/) || [ [], [] ])[1].length
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
   * Moves a whole section (as demarcated by ATX headings)
   * @param  {number} fromLine The line at which the section to be moved begins
   * @param  {number} toLine   The target line, above which the section should be inserted.
   * @return {ZettlrEditor}    This for chainability.
   */
  moveSection (fromLine, toLine) {
    this._cm.setValue(moveSection(this._cm.getValue(), fromLine, toLine))
    return this
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
      let newSize = this._fontsize + 10 * direction
      // Constrain the size so it doesn't run into errors
      if (newSize < 30) newSize = 30 // Less than thirty and CodeMirror doesn't display the text anymore.
      if (newSize > 400) newSize = 400 // More than 400 and you'll run into problems concerning headings 1
      this._fontsize = newSize
    }
    this._div.css('font-size', this._fontsize + '%')
    this._cm.refresh()
    return this
  }

  /**
    * This function copies text as HTML, if there are selections
    * @return {ZettlrEditor} This (chainabiltiy)
    */
  copyAsHTML () {
    if (this._cm.somethingSelected()) {
      let md = this._cm.getSelections().join(' ')
      let html = this._showdown.makeHtml(md)
      // Write both the HTML and the Markdown
      // (as fallback plain text) to the clipboard
      clipboard.write({ 'text': md, 'html': html })
    }
    return this
  }

  /**
   * This function pastes a clipboard selection as plain text regardless of what
   * the formatted HTML contents say.
   * @return {ZettlrEditor} Chainability.
   */
  pasteAsPlain () {
    // Simply overwrite the clipboard's HTML with the plain text contents to
    // make it appear we've "matched style" lol
    let plain = clipboard.readText()

    // Simple programmatical paste.
    if (plain && plain.length > 0) this.insertText(plain)

    return this
  }

  /**
   * Renders all citations that haven't been rendered yet.
   * @return {void} Does not return.
   */
  renderCitations () {
    let needRefresh = false
    let elements = $('.CodeMirror .citeproc-citation')
    elements.each((index, elem) => {
      elem = $(elem)
      if (elem.attr('data-rendered') !== 'yes') {
        let item = elem.text()
        let id = hash(item)
        if (this._citationBuffer[id] !== undefined) {
          elem.html(this._citationBuffer[id]).removeClass('error').attr('data-rendered', 'yes')
          needRefresh = true
        } else {
          let newCite = global.citeproc.getCitation(item)
          switch (newCite.status) {
            case 4: // Engine was ready, newCite.citation contains the citation
              elem.html(newCite.citation).removeClass('error').attr('data-rendered', 'yes')
              this._citationBuffer[id] = newCite.citation
              needRefresh = true
              break
            case 3: // There was an error loading the database
              elem.addClass('error')
              break
            case 2: // There was no database, so don't do anything.
              elem.attr('data-rendered', 'yes')
              break
          }
        }
      }
    })

    // We need to refresh the editor, because the updating process has certainly
    // altered the widths of the spans.
    if (needRefresh) this._cm.refresh()
  }

  /**
   * This method can be used to insert some text at the current cursor position.
   * ATTENTION: It WILL overwrite any given selection!
   * @param  {String} text The text to insert
   * @return {void}      Does not return.
   */
  insertText (text) { this._cm.replaceSelection(text) }

  /**
   * Marks the specified document clean
   *
   * @param {number} hash The hash of the document to mark clean
   * @memberof ZettlrEditor
   */
  markClean (hash) {
    let file = this._openFiles.find(e => e.fileObject.hash === hash)
    if (file) {
      file.cmDoc.markClean()
      this._tabs.markClean(file.fileObject.hash)
    } else {
      console.error(`Could not mark clean the document ${hash}. Not found.`)
    }
  }

  /**
    * Query if any of the documents are modified.
    * @return {boolean} True, if there are no changes, false, if there are.
    */
  isClean () {
    for (let doc of this._openFiles) {
      if (!doc.cmDoc.isClean()) return false
    }
    return true
  }

  /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
  runCommand (cmd) {
    // Shortcut for the only command that
    // actively should change the selection.
    if (cmd === 'selectWordUnderCursor') {
      this._cm.execCommand(cmd)
      return
    }

    let sel = this._cm.doc.listSelections()
    let oldCur = JSON.parse(JSON.stringify(this._cm.getCursor()))
    this._cm.execCommand(cmd)

    if (sel.length > 0) this._cm.doc.setSelections(sel)

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
   * Returns the current value of the editor.
   * @return {String} The current editor contents.
   */
  getValue () { return this._cm.getValue() }

  /**
   * Returns all selections in the current document.
   */
  getSelections () { return this._cm.doc.getSelections() }

  /**
   * Get the CodeMirror instance
   * @return {CodeMirror} The editor instance
   */
  getEditor () { return this._cm }
}

module.exports = ZettlrEditor
