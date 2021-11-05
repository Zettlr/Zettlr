/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        MarkdownEditor class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains the functionality to spin up a fully
 *                  functioning CodeMirror editor containing all the additional
 *                  API calls and hooks that Zettlr makes use of for its
 *                  powerful internal editor. The class's API provides a
 *                  multitude of options to tweak the editor to the specific
 *                  needs of different environments.
 *
 * END HEADER
 */

// Import our additional styles we need to put here since we don't have a Vue
// component for the editor itself.
require('./editor.less')

/**
 * UTILITY FUNCTIONS
 */

const getCodeMirrorDefaultOptions = require('./get-cm-options')
const safeAssign = require('../../util/safe-assign')
const countWords = require('../../util/count-words').default
const md2html = require('../../util/md-to-html')
const generateKeymap = require('./generate-keymap.js')
const generateTableOfContents = require('./util/generate-toc')

// Search plugin (module-namespaced set of utility functions)
const {
  searchNext,
  searchPrevious,
  replaceNext,
  replacePrevious,
  replaceAll,
  stopSearch
} = require('./plugins/search')

/**
 * APIs
 */
// const { clipboard, ipcRenderer } = require('electron')
const EventEmitter = require('events')

const ipcRenderer = window.ipc
const clipboard = window.clipboard

/**
 * CODEMIRROR & DEPENDENCIES
 */
require('./load-plugins.js')
const CodeMirror = require('codemirror')

/**
 * HOOKS (plugins that hook on to event listeners)
 */
const dropFilesHook = require('./hooks/drop-files')
const footnotesHook = require('./hooks/footnotes')
const formattingBarHook = require('./hooks/formatting-bar')
const pasteImagesHook = require('./hooks/paste-images')
const matchStyleHook = require('./hooks/match-style')
const { indentLinesHook, clearLineIndentationCache } = require('./hooks/indent-wrapped-lines')
const headingClassHook = require('./hooks/heading-classes')
const codeblockClassHook = require('./hooks/codeblock-classes')
const taskItemClassHook = require('./hooks/task-item-classes')
const muteLinesHook = require('./hooks/mute-lines')
const renderElementsHook = require('./hooks/render-elements')
const typewriterHook = require('./hooks/typewriter')
const { autocompleteHook, setAutocompleteDatabase } = require('./hooks/autocomplete')
const linkTooltipsHook = require('./hooks/link-tooltips').default
const noteTooltipsHook = require('./hooks/note-preview')

const displayContextMenu = require('./display-context-menu')

module.exports = class MarkdownEditor extends EventEmitter {
  /**
   * Creates a new MarkdownEditor instance attached to the anchorElement
   *
   * @param   {HTMLTextAreaElement|string}  anchorElement   The anchor element (either a DOM node or an ID to be used with document.getElementById)
   * @param   {Object}                      [cmOptions={}]  Optional CodeMirror options. If no object is provided, the instance will be instantiated with default options for Zettlr.
   */
  constructor (anchorElement, cmOptions = {}) {
    super() // Set up the event emitter
    /**
     * Holds the actual CodeMirror instance
     *
     * @var {CodeMirror}
     */
    this._instance = null

    /**
     * Contains the anchor textarea element to which the instance will attach
     * itself.
     *
     * @var {HTMLTextAreaElement}
     */
    this._anchorElement = null

    /**
     * Should the editor contents be displayed using the readability mode?
     *
     * @var {boolean}
     */
    this._readabilityMode = false

    /**
     * Contains the document's current active mode because after switching to
     * readability we can't retrieve that anymore, and if the user in between
     * switched documents, that's just awful.
     *
     * @var {string|undefined}
     */
    this._currentDocumentMode = 'multiplex'

    /**
     * Can hold a close-callback from an opened context menu
     *
     * @var {Function}
     */
    this._contextCloseCallback = null

    /**
     * The CodeMirror options
     *
     * @var  {Object}
     */
    this._cmOptions = getCodeMirrorDefaultOptions()

    /**
     * If true, the selections and potentially other values returned by the
     * instance will represent char counts instead of word counts.
     *
     * @var {boolean}
     */
    this._countChars = false

    // Parse the anchorElement until we get something useful
    if (typeof anchorElement === 'string' && document.getElementById(anchorElement) !== null) {
      this._anchorElement = document.getElementById(anchorElement)
    } else if (anchorElement instanceof HTMLTextAreaElement) {
      this._anchorElement = anchorElement
    } else {
      throw new Error(`Could not instantiate MarkdownEditor: anchorElement must be an ID or a DOM node (received: ${typeof anchorElement})`)
    }

    // Now, instantiate CodeMirror with the defaults
    this._instance = CodeMirror.fromTextArea(this._anchorElement, this._cmOptions)

    // Immediately afterwards, set the new options passed to overwrite
    this.setOptions(cmOptions)

    // Set the special CodeMirror-readonly class on the wrapper, because each
    // editor instance is readonly initially, and needs to be enabled
    // programmatically by setting MarkdownEditor::readonly = false.
    this._instance.getWrapperElement().classList.add('CodeMirror-readonly')

    // Attach plugins using event listeners ("hooks" in lieu of a better name)
    dropFilesHook(this._instance)
    footnotesHook(this._instance)
    formattingBarHook(this._instance)
    pasteImagesHook(this._instance)
    matchStyleHook(this._instance)
    indentLinesHook(this._instance)
    headingClassHook(this._instance)
    codeblockClassHook(this._instance)
    taskItemClassHook(this._instance)
    muteLinesHook(this._instance)
    renderElementsHook(this._instance)
    typewriterHook(this._instance)
    autocompleteHook(this._instance)
    linkTooltipsHook(this._instance)
    noteTooltipsHook(this._instance)

    // Indicate interactive elements while either the Command or Control-key is
    // held down.
    document.addEventListener('keydown', (event) => {
      const cmd = process.platform === 'darwin' && event.metaKey
      const ctrl = process.platform !== 'darwin' && event.ctrlKey

      if (!cmd && !ctrl) {
        return
      }

      const wrapper = this._instance.getWrapperElement()
      const elements = wrapper.querySelectorAll('.cma, .cm-zkn-link, .cm-zkn-tag')

      elements.forEach(element => {
        element.classList.add('meta-key')
      })
    })

    // And don't forget to remove the classes again
    document.addEventListener('keyup', (event) => {
      if (![ 'Meta', 'Control' ].includes(event.key)) {
        return // Not the right released key
      }

      const wrapper = this._instance.getWrapperElement()
      const elements = wrapper.querySelectorAll('.cma, .cm-zkn-link, .cm-zkn-tag')

      elements.forEach(element => {
        element.classList.remove('meta-key')
      })
    })

    // Propagate necessary events to the master process
    this._instance.on('change', (cm, changeObj) => {
      this.emit('change', changeObj)
    })

    this._instance.on('cursorActivity', (cm) => {
      this.emit('cursorActivity')
    })

    this._instance.on('mousedown', (cm, event) => {
      // Open links on both Cmd and Ctrl clicks - otherwise stop handling event
      if (process.platform === 'darwin' && !event.metaKey) return true
      if (process.platform !== 'darwin' && !event.ctrlKey) return true

      let cursor = this._instance.coordsChar({ left: event.clientX, top: event.clientY })
      let tokenInfo = this._instance.getTokenAt(cursor)

      if (tokenInfo.type === null) {
        return true
      }

      let tokenList = tokenInfo.type.split(' ')

      if (tokenList.includes('zkn-link')) {
        event.preventDefault()
        event.codemirrorIgnore = true
        this.emit('zettelkasten-link', tokenInfo.string)
      } else if (tokenList.includes('zkn-tag')) {
        event.preventDefault()
        event.codemirrorIgnore = true
        this.emit('zettelkasten-tag', tokenInfo.string)
      }
    })

    // Display a context menu if appropriate
    this._instance.getWrapperElement().addEventListener('contextmenu', (event) => {
      const shouldSelectWordUnderCursor = displayContextMenu(event, this._instance.isReadOnly(), (command) => {
        switch (command) {
          case 'cut':
          case 'copy':
          case 'paste':
            // NOTE: We do not send selectAll to main albeit there is such a command
            // because in the specific case of CodeMirror this results in unwanted
            // behaviour.
            // Needs to be issued from main on the holding webContents
            ipcRenderer.send('window-controls', { command: command })
            break
          case 'pasteAsPlain':
            this.pasteAsPlainText()
            break
          case 'copyAsHTML':
            this.copyAsHTML()
            break
          default:
            this._instance.execCommand(command)
            break
        }
        // In any case, re-focus the editor, either for cut/copy/paste to work
        // or to resume working afterwards
        this._instance.focus()
      }, (wordToReplace) => {
        // Simply replace the selection with the given word
        this._instance.replaceSelection(wordToReplace)
      })

      // If applicable, select the word under cursor
      if (shouldSelectWordUnderCursor) {
        this._instance.execCommand('selectWordUnderCursor')
      }
    })

    // Listen to updates from the assets provider
    ipcRenderer.on('assets-provider', (event, which) => {
      if (which === 'snippets-updated') {
        // The snippet list has been updated, so we must reflect this.
        this.updateSnippetAutocomplete().catch(err => console.error(err))
      }
    })

    // Initial retrieval of snippets
    this.updateSnippetAutocomplete().catch(err => console.error(err))
  } // END CONSTRUCTOR

  // SEARCH FUNCTIONALITY
  searchNext (term) {
    searchNext(this._instance, term)
  }

  searchPrevious (term) {
    searchPrevious(this._instance, term)
  }

  replaceNext (term, replacement) {
    replaceNext(this._instance, term, replacement)
  }

  replacePrevious (term, replacement) {
    replacePrevious(this._instance, term, replacement)
  }

  replaceAll (term, replacement) {
    replaceAll(this._instance, term, replacement)
  }

  stopSearch () {
    stopSearch()
  }

  /**
   * Pastes the clipboard contents as plain text, regardless of any formatted
   * text present.
   */
  pasteAsPlainText () {
    let plainText = clipboard.readText()

    // Simple programmatical paste.
    if (plainText.length > 0) {
      this._instance.replaceSelection(plainText)
    }
  }

  /**
   * Copies the current editor contents into the clipboard as HTML
   */
  copyAsHTML () {
    if (!this._instance.somethingSelected()) return
    let md = this._instance.getSelections().join(' ')
    let html = md2html(md)
    // Write both the HTML and the Markdown
    // (as fallback plain text) to the clipboard
    clipboard.write({ 'text': md, 'html': html })
  }

  /**
   * Small function that jumps to a specific line in the editor.
   *
   * @param  {Number} line The line to pull into view
   */
  jtl (line) {
    const { from, to } = this._instance.getViewport()
    const viewportSize = to - from
    // scrollIntoView first and foremost pulls something simply into view, but
    // we want it to be at the top of the window as expected by the user, so
    // we need to pull in a full viewport, beginning at the corresponding line
    // and expanding unto one full viewport size.
    let lastLine = line + viewportSize

    // CodeMirror will not sanitise the viewport size.
    if (lastLine >= this._instance.doc.lineCount()) {
      lastLine = this._instance.doc.lineCount() - 1
    }

    this._instance.scrollIntoView({
      from: {
        line: line,
        ch: 0
      },
      to: {
        line: lastLine,
        ch: 0
      }
    })
  }

  /**
   * Sets the current options with a new options object, which will be merged
   *
   * @param   {Object}  newOptions  The new options
   */
  setOptions (newOptions) {
    // Before actually merging the options, we have to detect changes in the
    // rendering preferences.
    let shouldRemoveMarkers = false

    if ('zettlr' in newOptions && 'render' in newOptions.zettlr) {
      // If one of these options has changed from true to false, remove all
      // markers below and have the remaining markers re-rendered afterwards.
      const oldOpt = this._cmOptions.zettlr.render
      const newOpt = newOptions.zettlr.render

      for (const key in oldOpt) {
        if (!(key in newOpt)) {
          continue
        }

        if (oldOpt[key] === true && newOpt[key] === false) {
          shouldRemoveMarkers = true
          break
        }
      }
    }

    if (shouldRemoveMarkers) {
      // If shouldRemoveMarkers is true, one of the rendering options has been
      // disabled, so we must remove all markers and then re-render only those
      // that should still be displayed.
      const markers = this._instance.doc.getAllMarks()
      for (const marker of markers) {
        marker.clear()
      }
    }

    // Now, we can safely merge the options
    this._cmOptions = safeAssign(newOptions, this._cmOptions)

    // Next, set all options on the CodeMirror instance. This will internally
    // fire all necessary events, apart from those we need to fire manually.
    for (const name in this._cmOptions) {
      if (this._cmOptions.hasOwnProperty(name)) {
        this._instance.setOption(name, this._cmOptions[name])
      }
    }

    // Perform any after-option-setting-stuff
    this._instance.setOption('extraKeys', generateKeymap(this))

    // Clear the line indentation cache for the corresponding hook
    clearLineIndentationCache()
  }

  /**
   * Returns an option with the given name
   *
   * @param   {String}  name  The name of the key to request
   *
   * @return  {Mixed}         The value of the key
   */
  getOption (name) {
    return this._cmOptions[name]
  }

  /**
   * Swaps the current CodeMirror Document with a new one
   *
   * @param   {Doc}     cmDoc         The CodeMirror document instance
   * @param   {string}  documentMode  The mode to be associated with the editor
   *
   * @return  {Doc}                   The previous CodeMirror document instance
   */
  swapDoc (cmDoc, documentMode) {
    const oldDoc = this._instance.swapDoc(cmDoc)
    this._instance.focus()

    this._currentDocumentMode = documentMode

    if (!this.readabilityMode) {
      this.setOptions({ 'mode': this._currentDocumentMode })
    } else {
      this.setOptions({ 'mode': 'readability' })
    }

    return oldDoc
  }

  /**
   * Whether the instance is currently considered "clean"
   *
   * @return  {Boolean}  True, if no changes are recorded
   */
  isClean () {
    return this._instance.isClean()
  }

  /**
   * Runs a command on the underlying CodeMirror instance
   *
   * @param   {String}  cmd  The command to run
   */
  runCommand (cmd) {
    this._instance.execCommand(cmd)
  }

  /**
   * Issues a focus command to the underlying instance
   */
  focus () {
    this._instance.focus()
  }

  /**
   * Sets an autocomplete database of given type to a new value
   *
   * @param   {String}  type      The type of the database
   * @param   {Object}  database  The show-hint-addon compatible database
   */
  setCompletionDatabase (type, database) {
    setAutocompleteDatabase(type, database)
  }

  /**
   * Updates the list of available snippets.
   */
  async updateSnippetAutocomplete () {
    const snippetList = await ipcRenderer.invoke('assets-provider', { command: 'list-snippets' })

    const snippetsDB = []

    for (const snippet of snippetList) {
      const content = await ipcRenderer.invoke('assets-provider', {
        command: 'get-snippet',
        payload: { name: snippet }
      })

      snippetsDB.push({
        displayText: snippet,
        text: content
      })
    }

    this.setCompletionDatabase('snippets', snippetsDB)
  }

  /* * * * * * * * * * * *
   * GETTERS AND SETTERS *
   * * * * * * * * * * * */

  /**
   * This function builds a table of contents based on the editor contents
   *
   * @return {Array} An array containing objects with all headings
   */
  get tableOfContents () {
    return generateTableOfContents(this.value)
  }

  /**
   * Returns info about the editor instance
   *
   * @return  {Object}  An object containing, e.g., words, chars, selections.
   */
  get documentInfo () {
    let ret = {
      'words': this.wordCount,
      'chars': this.charCount,
      'chars_wo_spaces': this.charCountWithoutSpaces,
      'cursor': Object.assign({}, this._instance.getCursor()),
      'selections': []
    }

    if (this._instance.somethingSelected()) {
      // Write all selections into the file info object
      let selectionText = this._instance.getSelections()
      let selectionBounds = this._instance.listSelections()
      for (let i = 0; i < selectionText.length; i++) {
        ret.selections.push({
          'selectionLength': countWords(selectionText[i], this._countChars),
          'start': Object.assign({}, selectionBounds[i].anchor),
          'end': Object.assign({}, selectionBounds[i].head)
        })
      }
    }

    return ret
  }

  /**
   * Should the editor return char counts instead of word counts where appropriate?
   *
   * @param   {boolean}  shouldCountChars  The value
   */
  set countChars (shouldCountChars) {
    this._countChars = shouldCountChars
  }

  /**
   * Returns whether the editor returns char counts in appropriate places.
   *
   * @return  {boolean}  Whether the editor counts chars or words.
   */
  get countChars () {
    return this._countChars
  }

  /**
   * Whether the editor is in fullscreen mode
   *
   * @return  {Boolean}  True if the editor option for fullScreen is set
   */
  get isFullscreen () {
    return this._cmOptions.fullScreen
  }

  /**
   * Enters or exits the editor fullscreen mode
   *
   * @param   {Boolean}  shouldBeFullscreen  Whether the editor should be in fullscreen
   */
  set isFullscreen (shouldBeFullscreen) {
    this.setOptions({ 'fullScreen': shouldBeFullscreen })

    // Refresh to reflect the size changes
    this._instance.refresh()
  }

  /**
   * Whether the editor is currently in typewriter
   *
   * @return  {Boolean}  True if typewriter mode is active
   */
  get hasTypewriterMode () {
    return this._cmOptions.zettlr.typewriterMode
  }

  /**
   * Activates or deactivates typewriter mode
   *
   * @param   {Boolean}  shouldBeTypewriter  True or False
   */
  set hasTypewriterMode (shouldBeTypewriter) {
    this.setOptions({ 'zettlr': { 'typewriterMode': shouldBeTypewriter } })
  }

  /**
   * Determines whether the editor is in distraction free mode
   *
   * @return  {boolean}  True or false
   */
  get distractionFree () {
    return this._cmOptions.fullScreen
  }

  /**
   * Sets the editor into or out of distraction free
   *
   * @param   {boolean}  shouldBeFullscreen  Whether the editor should be in distraction free
   */
  set distractionFree (shouldBeFullscreen) {
    this.setOptions({ fullScreen: shouldBeFullscreen })

    if (this.distractionFree) {
      this._instance.getWrapperElement().classList.add('CodeMirror-fullscreen')
    } else {
      this._instance.getWrapperElement().classList.remove('CodeMirror-fullscreen')
    }
  }

  /**
   * Returns whether or not the readability mode is currently active
   *
   * @return  {boolean}  True if the readability mode is active
   */
  get readabilityMode () {
    return this._readabilityMode
  }

  /**
   * Sets the readability mode
   *
   * @param   {boolean}  shouldBeReadability  Whether or not the mode should be active
   */
  set readabilityMode (shouldBeReadability) {
    if (shouldBeReadability && !this._readabilityMode) {
      // Switch to readability
      this.setOptions({ 'mode': 'readability' })
      this._readabilityMode = true
    } else if (!shouldBeReadability && this._readabilityMode) {
      // Switch off from readability
      this.setOptions({ 'mode': this._currentDocumentMode })
      this._readabilityMode = false
    }
  }

  /**
   * Whether the instance is currently readonly
   *
   * @return  {Boolean}  True if users cannot edit the contents
   */
  get readOnly () {
    return this._cmOptions.readOnly
  }

  /**
   * Sets the readonly flag on the instance
   *
   * @param   {Boolean}  shouldBeReadonly  Whether the editor contents should be readonly
   */
  set readOnly (shouldBeReadonly) {
    // Make sure we only set readOnly if the state has changed to prevent any
    // lag due to the setOptions handler taking quite some time.
    if (this.readOnly === shouldBeReadonly) {
      return
    }

    this.setOptions({ readOnly: shouldBeReadonly })

    // Set a special class to indicate not that it's an empty document,
    // but rather that none is open atm
    if (shouldBeReadonly) {
      this._instance.getWrapperElement().classList.add('CodeMirror-readonly')
    } else {
      this._instance.getWrapperElement().classList.remove('CodeMirror-readonly')
    }
  }

  /**
   * Returns the current contents of the editor
   *
   * @return  {String}  The editor contents
   */
  get value () {
    return this._instance.getValue()
  }

  /**
   * Returns the word count of the editor contents
   *
   * @return  {Number}  The word count
   */
  get wordCount () {
    return countWords(this.value, false)
  }

  /**
   * Returns the char count of the editor contents
   *
   * @return  {Number}  The number of characters
   */
  get charCount () {
    return countWords(this.value, true)
  }

  /**
   * Return the amount of characters without spaces
   *
   * @return  {Number}  The number of chars without spaces
   */
  get charCountWithoutSpaces () {
    return countWords(this.value.replace(/ +/g, ''), true)
  }

  /**
   * Returns the underlying CodeMirror instance
   *
   * @return  {CodeMirror}  The CodeMirror instance
   */
  get codeMirror () {
    return this._instance
  }
}
