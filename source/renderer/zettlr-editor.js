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
const countWords = require('../common/util/count-words')
const objectToArray = require('../common/util/object-to-array')
const moveSection = require('../common/util/move-section')
const EditorTabs = require('./util/editor-tabs')
const EditorSearch = require('./util/editor-search')

const MarkdownEditor = require('./modules/markdown-editor')

// Finally load CodeMirror itself
const CodeMirror = require('codemirror')

const MD_MODE = { name: 'multiplex' }

const SAVE_TIMEOUT = 5000 // Save every 5 seconds

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
    this._transientHashes = [] // An array of hashes that when opened should be opened transient

    this._timeout = null // Stores a current timeout for a save-command

    this._toSync = [] // Holds an array of files that have yet to be synced

    this._searcher = new EditorSearch(null)
    this._tabs = new EditorTabs()
    // The user can select or close documents on the tab bar
    this._tabs.setIntentCallback(this._onTabAction.bind(this))

    // All individual citations fetched during this session.
    this._citationBuffer = Object.create(null)

    // Should the editor mute lines while in distraction-free mode?
    this._mute = true
    // Caches the "left" style property during distraction free
    this._leftBeforeDistractionFree = ''

    // Caches the width of a space (in normal font and in monospace font)
    this._spaceWidth = 0
    this._monospaceWidth = 0

    global.editor.announceTransientFile = (hash) => {
      if (this._openFiles.find(e => e.fileObject.hash === hash)) return
      this._transientHashes.push(hash)
    }

    this._editor = new MarkdownEditor('cm-text')

    this._editor.on('change', (changeOrigin, newTextCharCount, newTextWordCount) => {
      let file = this._getActiveFile()

      if (changeOrigin === 'paste') {
        // In case the user pasted more than ten words don't let these count towards
        // the word counter. Simply update the word count before the save function
        // is triggered. This way none of the just pasted words will count.
        if (this._countChar && newTextCharCount > 10) {
          file.lastWordCount = this._editor.charCount
        } else if (newTextWordCount > 10) {
          file.lastWordCount = this._editor.wordCount
        }
      }

      if (changeOrigin !== 'setValue') {
        // If origin is setValue this means that the contents have been
        // programatically changed -> no need to flag any modification.
        // Clear the timeouts in any case
        if (this._timeout) clearTimeout(this._timeout)
        if (this._citationTimeout) clearTimeout(this._citationTimeout)

        // At this moment, the document also is no longer considered transient
        if (file.transient) {
          file.transient = false
          // Synchronise the file changes to the document tabs
          this._tabs.syncFiles(this._openFiles, this._currentHash)
        }

        // Check if the change actually modified the doc or not.
        if (this._editor.isClean()) {
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
            this.saveFiles()
          }, SAVE_TIMEOUT)
        }
      }

      // Finally, update the file info in the toolbar
      this._renderer.updateFileInfo(this._editor.documentInfo)

      // The sidebar needs the correct table of contents, so signal the
      // corresponding event to the renderer
      this._renderer.updateTOC(this._editor.tableOfContents)
    }) // END MarkdownEditor::onChange

    // We also need to update the document info on cursor activity
    // to capture changes in the selections.
    this._editor.on('cursorActivity', (e) => {
      this._renderer.updateFileInfo(this._editor.documentInfo)
    })

    // Listen to special click events on the MarkdownEditor
    this._editor.on('zettelkasten-link', (linkContents) => {
      this._renderer.autoSearch(linkContents, true)
    })

    this._editor.on('zettelkasten-tag', (tag) => {
      this._renderer.autoSearch(tag)
    })

    // Set up the helper classes with the CM instance
    this._searcher.setInstance(this._editor.codeMirror)

    // TODO this._cm.on('mousedown', (cm, event) => {
    //   // Ignore click events if they attempt to perform a special action
    //   let target = event.target
    //   let specialClasses = [ 'cma', 'cm-zkn-tag', 'cm-zkn-link' ]
    //   let macMeta = process.platform === 'darwin' && event.metaKey
    //   let otherCtrl = process.platform !== 'darwin' && event.ctrlKey
    //   let isSpecial = false
    //   for (let c of specialClasses) {
    //     if (target.classList.contains(c)) isSpecial = true
    //   }
    //   let isFootnote = target.classList.contains('cm-link') && target.innerText.indexOf('^') === 0

    //   if ((isSpecial || isFootnote) && (macMeta || otherCtrl)) event.codemirrorIgnore = true
    // })

    // Finally create the annotateScrollbar object to be able to annotate the
    // scrollbar with search results.
    this._scrollbarAnnotations = this._editor.codeMirror.annotateScrollbar('sb-annotation')
    this._scrollbarAnnotations.update([])
  }
  // END constructor

  pasteAsPlain () {
    this._editor.pasteAsPlainText()
  }

  /**
   * Enters the readability mode
   */
  enterReadability () {
    this._editor.setOptions({ 'mode': 'readability' })
  }

  /**
   * Exits the readability mode.
   */
  exitReadability () {
    this._editor.setOptions({ 'mode': 'multiplex' })
  }

  /**
   * Returns whether or not the editor is currently in readability mode
   * @return {Boolean} Whether or not readability mode is active.
   */
  isReadabilityModeActive () {
    return this._editor.getOption('mode') === 'readability'
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
    * @param  {ZettlrFile}   file   The file to be renderer
    * @param  {Boolean}      isSync If set to true, will open "in background"
    * @return {ZettlrEditor}       Chainability.
    */
  open (file, isSync = false) {
    if (!this._openFiles.find(elem => elem.fileObject.hash === file.hash)) {
      // We need to create a new doc for the file and then swap
      // the currently active doc.

      // Bind the "correct" filetree object to the doc, because
      // we won't be accessing the content property at all, hence
      // it's easier to have the file object bound here that all
      // of the renderer is working with.
      let fileTreeObject = this._renderer.findObject(file.hash)

      let shouldBeTransient = false
      if (this._transientHashes.includes(file.hash)) {
        // If the _transientHashes array includes the file's hash, initialize
        // it as a transient file, and remove it from the array (it's simply)
        // our way to maintain the information due to asynchronous requests
        let idx = this._transientHashes.indexOf(file.hash)
        this._transientHashes.splice(idx, 1)
        shouldBeTransient = true
      }

      // Lastly, we need to determine if the current document is considered
      // transient. If it is, this means we need to "close" it.
      // At this moment, the document also is no longer considered transient
      let activeFile = this._getActiveFile()
      if (activeFile && activeFile.transient) {
        // We'll attempt to close the tab, as this function fulfills the functionality we need
        this.attemptCloseTab()
        // Swap out all properties of the current tab
        activeFile.fileObject = fileTreeObject
        activeFile.cmDoc = CodeMirror.Doc(file.content)
        activeFile.transient = shouldBeTransient
        activeFile.lastWordCount = countWords(file.content, this._countChars)
      } else {
        // Simply append to the end of the array
        this._openFiles.push({
          'fileObject': fileTreeObject,
          'cmDoc': CodeMirror.Doc(file.content),
          'transient': shouldBeTransient,
          'lastWordCount': countWords(file.content, this._countChars)
        })
      }
    }

    // I know that I will make this mistake in the future, so here's why we
    // don't swap the file.content property during this: Because there's a
    // different function to do so. Use it! Don't monkey path _swapFiles. NO
    // content replacement here!
    // ***
    // Only actually swap the file if it's a synchronized file (e.g. no active
    // opening by the user, it's rather to keep the editor up in sync with the
    // FSAL)
    if (!isSync) {
      this._swapFile(file.hash)
    } else {
      // We need to at least announce the file in the tab bar
      this._tabs.syncFiles(this._openFiles, this._currentHash)
      this._toSync.splice(this._toSync.indexOf(file.hash), 1)

      if (this._toSync.length === 0) {
        const lastFile = global.config.get('lastFile')

        const lastFileOpen = this._openFiles.map(e => e.fileObject.hash).includes(lastFile)

        if (lastFileOpen) {
          console.log('Finishing background sync, swapping lastFile ...', lastFile)
          this._swapFile(lastFile)
        } else if (!lastFileOpen && this._openFiles.length > 0) {
          console.log('No last file but theres something in the openFiles, opening ...', this._openFiles)
          this._swapFile(this._openFiles[0].fileObject.hash)
          // We have finished background-syncing the files. Now
          // we need to open the active file.
        } else {
          console.error('lastFile was null and there are no open files to switch to!')
        }
      }
    }

    return this
  }

  /**
   * Exchanges the current document displayed.
   * @param {Number} hash The hash of the file to be swapped
   */
  _swapFile (hash) {
    // Exchanges the CodeMirror document object
    let file = this._openFiles.find(elem => elem.fileObject.hash === hash)
    if (!file) return console.log('No file found to swap to!', hash, this._openFiles)

    // We need to set the markdownImageBasePath _before_ swapping the doc
    // as the CodeMirror instance will begin rendering images as soon as
    // this happens, and it needs the correct path for this.
    this._editor.setOptions({
      // Set the mode based on the extension
      'mode': (file.fileObject.ext === '.tex') ? 'stex' : 'multiplex',
      'zettlr': {
        'markdownImageBasePath': path.dirname(file.fileObject.path)
      }
    })

    // swapDoc returns the old doc, but we retain a reference in the
    // _openFiles array so we don't need to catch it.
    this._editor.swapDoc(file.cmDoc)
    this._currentHash = hash

    // Enable editing the editor contents, if applicable
    this._editor.readOnly = false

    // Synchronise the file changes to the document tabs
    this._tabs.syncFiles(this._openFiles, this._currentHash)

    // Last but not least: If there are any search results currently
    // display, mark the respective positions.
    this._searcher.markResults(file.fileObject)

    // The active file has changed
    this._activeFileChanged()

    // TODO this._cm.focus() // DEBUG Check for side effects
  }

  /**
   * Synchronises a list of hashes with the open documents in the editor.
   * @param {Array} newHashes A potential new list of hashes to open/sync.
   */
  syncFiles (newHashes = this._openFiles.map(elem => elem.fileObject.hash)) {
    if (newHashes.length === 0) {
      this._openFiles = []
      // Clear out the editor (TODO: Not DRY, as copied from the close command)
      this._editor.swapDoc(CodeMirror.Doc(''))
      this._currentHash = null
      // Reset the base path
      this._editor.setOptions({ zettlr: { markdownImageBasePath: '' } })

      // Disable the editor
      this._editor.readOnly = true

      // The active file has changed (so to speak)
      this._activeFileChanged()
      return
    }

    // Now we need all hashes that are currently open ...
    let oldHashes = this._openFiles.map(elem => elem.fileObject.hash)
    // ... as well as the index of the currently selected file (in case
    // it was closed)
    let lastHashIndex = oldHashes.indexOf(this._currentHash)
    // To prevent undefined in case something went wrong
    if (lastHashIndex < 0) {
      lastHashIndex = 0
      console.warn('The current opened file was not found in the list of open files during sync!')
    }

    // Then, close all files no longer present.
    for (let fileDescriptor of this._openFiles) {
      if (!newHashes.includes(fileDescriptor.fileObject.hash)) {
        // Remove from array
        this._openFiles.splice(this._openFiles.indexOf(fileDescriptor), 1)
      }
    }

    // Make sure we have a valid index to open later
    if (lastHashIndex >= this._openFiles.length) lastHashIndex = this._openFiles.length - 1

    // Now, determine all files we have yet to open anew.
    this._toSync = newHashes.filter(fileHash => !oldHashes.includes(fileHash))
    if (this._toSync.length > 0) {
      for (let fileHash of this._toSync) {
        global.ipc.send('file-request-sync', { 'hash': fileHash })
      }
    }

    // New tags mean we might have potential new file matches
    // --> signal this to the autocompletion.
    this.signalUpdateFileAutocomplete()

    // Last but not least, exchange the current hash, if not present anymore.
    // We'll use the same index for that, because, purely from a visual
    // perspective, it makes absolutely sense that the new active file is at
    // roughly the same position than the former one.
    if (!newHashes.includes(this._currentHash) &&
        this._currentHash !== null &&
        this._openFiles.length > 0) {
      this._swapFile(this._openFiles[lastHashIndex].fileObject.hash)
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
    } else if (intent === 'make-intransient') {
      let requestedFile = this._openFiles.find((elem) => { return elem.fileObject.hash === hash })
      requestedFile.transient = false
      this._tabs.syncFiles(this._openFiles, this._currentHash)
    }
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
      let cursor = JSON.parse(JSON.stringify(openedFile.cmDoc.getCursor()))
      openedFile.cmDoc.setValue(contents)
      openedFile.cmDoc.setCursor(cursor)
      // Now mark clean this one document using the function, which also takes
      // care to instruct main to remove the edit flag if applicable.
      this.markClean(openedFile.fileObject.hash)
      openedFile.lastWordCount = countWords(contents, this._countChars)
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
      this._editor.swapDoc(CodeMirror.Doc('', MD_MODE))
      this._currentHash = null
      // Reset the base path
      this._editor.setOptions({ zettlr: { markdownImageBasePath: '' } })
      this.signalUpdateFileAutocomplete() // Autocomplete with no file match

      // Enable editing the editor contents, if applicable
      this._editor.readOnly = true
    }

    if (this._currentHash === fileToClose.fileObject.hash && this._openFiles.length > 0) {
      // The current file has been closed: Select another one
      if (currentIndex > 0) {
        this._swapFile(this._openFiles[currentIndex - 1].fileObject.hash)
      } else {
        this._swapFile(this._openFiles[0].fileObject.hash)
      }
    } else if (this._currentHash === fileToClose.fileObject.hash) {
      // There are no more open files -> reset the currentHash pointer
      this._currentHash = null
    }

    // The active file has changed
    this._activeFileChanged()

    return this
  }

  /**
   * Attempts to close an open tab, and returns true if it did.
   * @returns {boolean} True, if a tab has been closed, otherwise false.
   */
  attemptCloseTab () {
    if (this._currentHash !== null) {
      // Send the close request to main
      global.ipc.send('file-close', { 'hash': this._currentHash })
      return true
    } else {
      return false
    }
  }

  /**
   * Saves the currently open and modified files. Optionally supports only saving the active file.
   * @param {Boolean} [onlyActiveFile=false] If true, only attempts to save the active file.
   */
  saveFiles (onlyActiveFile = false) {
    let filesToSave = this._openFiles
    if (onlyActiveFile) filesToSave = [this._getActiveFile()]
    // Go through all open files, and, if they are modified, save them
    for (let file of filesToSave) {
      if (file.cmDoc.isClean()) continue // No need to save
      let descriptor = {}
      descriptor.hash = file.fileObject.hash
      descriptor.content = file.cmDoc.getValue()
      let wordcount = countWords(descriptor.content, this._countChars)
      descriptor.offsetWordcount = wordcount - file.lastWordCount
      file.lastWordCount = wordcount
      // Also update the file's wordcount
      global.ipc.send('file-save', descriptor)
      // If applicable, notify the renderer
      if (file.fileObject.hash === this._currentHash) this._renderer.signalActiveFileChanged()
    }
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
    let activeFile = this._getActiveFile()
    return (activeFile) ? activeFile.fileObject : undefined
  }

  /**
   * Returns the current active file content. NOTE: This is the internal version
   * that returns the full object, not just the fileObject.
   */
  _getActiveFile () {
    return this._openFiles.find(e => e.fileObject.hash === this._currentHash)
  }

  /**
    * Toggles the distraction free mode
    */
  toggleDistractionFree () {
    if (this._editor.isFullscreen) {
      this._editor.isFullscreen = false
      this._div.removeClass('fullscreen')
      this._div.css('left', this._leftBeforeDistractionFree)
    } else {
      this._editor.isFullscreen = true
      this._div.addClass('fullscreen')
      this._leftBeforeDistractionFree = this._div.css('left')
      if (this._leftBeforeDistractionFree === '0px') this._leftBeforeDistractionFree = ''
      this._div.css('left', '') // Remove the "left" property
    }
  }

  /**
   * Toggles the typewriter mode of the editor on and off
   */
  toggleTypewriterMode () {
    if (this._editor.hasTypewriterMode) {
      this._editor.hasTypewriterMode = false
    } else {
      this._editor.hasTypewriterMode = true
    }
  }

  /**
   * Alter the font size of the editor.
   * @param  {Number}  direction  The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
   */
  zoom (direction) {
    this._editor.zoom(direction)
  }

  /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
  runCommand (cmd) {
    this._editor.runCommand(cmd)
  }

  /**
   * Gets called by the Renderer everytime the configuration changes so that the
   * editor can reload all defaults
   * @return {ZettlrEditor} Chainability
   */
  configChange () {
    // The configuration has changed, so reload everything
    let newOptions = {
      indentUnit: global.config.get('editor.indentUnit'),
      autoCloseBrackets: global.config.get('editor.autoCloseBrackets'),
      keyMap: global.config.get('editor.inputMode'),
      direction: global.config.get('editor.direction'),
      zettlr: {
        muteLines: global.config.get('muteLines'),
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
    }

    // this._countChars = global.config.get('editor.countChars')

    // Set the autoCorrect options
    let conf = global.config.get('editor.autoCorrect')
    if (!conf.active) {
      newOptions.autoCorrect = false
    } else {
      // Convert the replacements into the correct format for the plugin
      let keys = {}
      for (let repl of conf.replacements) {
        keys[repl.key] = repl.val
      }
      newOptions.autoCorrect = {
        style: conf.style,
        quotes: conf.quotes,
        replacements: keys
      }
    }

    // Finally set the updated values
    this._editor.setOptions(newOptions)

    // Check for RTL-support
    setTimeout(() => {
      // Why wrap it in a timeout? Because this specific setting requires the
      // instance to be rendered before we can actually set that thing.
      // this._cm.setOption('direction', global.config.get('editor.direction'))
      // this._cm.setOption('rtlMoveVisually', global.config.get('editor.rtlMoveVisually'))
    }, 100)

    return this
  }

  /**
   * This sets the tag database necessary for the tag autocomplete.
   * @param {Object} tagDB An object (here with prototype due to JSON) containing tags
   */
  setTagDatabase (tagDB) {
    this._editor.setCompletionDatabase('tags', tagDB)
  }

  /**
   * Sets the citeprocIDs available to autocomplete to a new list
   * @param {Array} idList An array containing the new IDs
   */
  setCiteprocIDs (idList) {
    this._editor.setCompletionDatabase('citekeys', idList)
  }

  /**
   * Signals an update to the autocompletion to update its internal file
   * database.
   */
  signalUpdateFileAutocomplete () {
    let dir = this._renderer.getCurrentDir()
    if (!dir) return this._editor.setCompletionDatabase('files', [])

    let fileDatabase = {}

    // Navigate to the root to include as many files as possible
    while (dir.parent) dir = dir.parent
    let tree = objectToArray(dir, 'children').filter(elem => elem.type === 'file')

    for (let file of tree) {
      let fname = path.basename(file.name, path.extname(file.name))
      let displayText = fname // Fallback: Only filename
      if (global.config.get('display.useFirstHeadings') && file.firstHeading) {
        // The user wants to use first headings as titles,
        // so use them for autocomplete as well
        displayText = fname + ': ' + file.firstHeading
      } else if (file.frontmatter && file.frontmatter.title) {
        // (Else) if there is a frontmatter, use that title
        displayText = fname + ': ' + file.frontmatter.title
      }

      fileDatabase[fname] = {
        'text': file.id || fname, // Use the ID, if given, or the filename
        'displayText': displayText,
        'id': file.id || false
      }
    }

    // Modify all files that are potential matches
    for (let candidate of this._renderer.matchFile(this._currentHash)) {
      let entry = fileDatabase[candidate.fileDescriptor.name]
      if (entry) {
        // Modify
        entry.className = 'cm-hint-colour'
        entry.matches = candidate.matches
      } else {
        let file = candidate.fileDescriptor
        let fname = path.basename(file.name, path.extname(file.name))
        let displayText = fname // Always display the filename
        if (file.frontmatter && file.frontmatter.title) displayText += ' ' + file.frontmatter.title
        fileDatabase[candidate.fileDescriptor.name] = {
          'text': file.id || fname, // Use the ID, if given, or the filename
          'displayText': displayText,
          'id': file.id || false,
          'className': 'cm-hint-colour',
          'matches': candidate.matches
        }
      }
    }

    this._editor.setCompletionDatabase('files', fileDatabase)
  }

  /**
   * This function is called internally to start all processes whenever
   * the active file has changed.
   */
  _activeFileChanged () {
    // Synchronise the file changes to the document tabs
    this._tabs.syncFiles(this._openFiles, this._currentHash)

    // The file manager needs to be informed that the active file has changed
    global.store.set('selectedFile', this._currentHash)
    // Same for the main process
    global.ipc.send('set-active-file', { 'hash': this._currentHash })

    // Also, update the autocomplete
    this.signalUpdateFileAutocomplete()

    // Finally, inform the renderer about the necessary updates
    this._renderer.signalActiveFileChanged()
    this._renderer.updateFileInfo(this._editor.documentInfo)
    this._renderer.updateTOC(this._editor.tableOfContents)
  }

  /**
    * Returns an object containing info about the opened file.
    * @return {Object} An object containing words, chars, chars_wo_spaces, if selection: words_sel and chars_sel
    */
  getFileInfo () {
    return this._editor.documentInfo
  }

  /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
  replaceWord (word) {
    // We obviously need a selection to replace
    if (!this._getActiveFile().cmDoc.somethingSelected()) return

    // Replace word and select new word
    this._getActiveFile().cmDoc.replaceSelection(word, 'around')
  }

  /**
    * This function builds a table of contents based on the editor contents
    * @return {Array} An array containing objects with all headings
    */
  buildTOC () {
    return this._editor.tableOfContents
  }

  /**
    * Small function that jumps to a specific line in the editor.
    * @param  {Integer} line The line to pull into view
    * @return {void}      No return.
    */
  jtl (line) {
    this._editor.jtl(line)
  }

  /**
   * Moves a whole section (as demarcated by ATX headings)
   * @param  {Number} fromLine The line at which the section to be moved begins
   * @param  {Number} toLine   The target line, above which the section should be inserted.
   */
  moveSection (fromLine, toLine) {
    let value = this._getActiveFile().cmDoc.getValue()
    let newValue = moveSection(value, fromLine, toLine)
    this._getActiveFile().cmDoc.setValue(newValue)
  }

  /**
   * This method can be used to insert some text at the current cursor position.
   * ATTENTION: It WILL overwrite any given selection!
   * @param  {String} text The text to insert
   * @return {void}      Does not return.
   */
  insertText (text) {
    this._getActiveFile().cmDoc.replaceSelection(text)
  }

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
    * Focus the CodeMirror instance
    */
  focus () {
    this._editor.focus()
  }

  /**
   * Returns the current value of the editor.
   * @return {String} The current editor contents.
   */
  getValue () {
    return this._editor.value
  }

  /**
   * Returns all selections in the current document.
   */
  getSelections () {
    return this._getActiveFile().cmDoc.getSelections()
  }

  /**
   * Get the CodeMirror instance
   * @return {CodeMirror} The editor instance
   */
  getEditor () {
    return this._cm
  }
}

module.exports = ZettlrEditor
