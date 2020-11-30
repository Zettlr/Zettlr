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

/**
 * UTILITY FUNCTIONS
 */

const getCodeMirrorDefaultOptions = require('./get-cm-options')
const safeAssign = require('../../../common/util/safe-assign')
const countWords = require('../../../common/util/count-words')
const md2html = require('../../../common/util/md-to-html')
const generateKeymap = require('./generate-keymap.js')

/**
 * APIs
 */
const { clipboard, ipcRenderer } = require('electron')
const EventEmitter = require('events')

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
const pasteImagesHook = require('./hooks/paste-images')
const matchStyleHook = require('./hooks/match-style')
const { indentLinesHook, clearLineIndentationCache } = require('./hooks/indent-wrapped-lines')
const headingClassHook = require('./hooks/heading-classes')
const codeblockClassHook = require('./hooks/codeblock-classes')
const zoomHook = require('./hooks/zoom')
const muteLinesHook = require('./hooks/mute-lines')
const renderElementsHook = require('./hooks/render-elements')
const typewriterHook = require('./hooks/typewriter')
const initiateTablesHook = require('./hooks/initiate-tables')
const { autocompleteHook, setAutocompleteDatabase } = require('./hooks/autocomplete')
const linkTooltipsHook = require('./hooks/link-tooltips')

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
     * Remembers the last mode while toggling the readability mode
     *
     * @var {String|undefined}
     */
    this._lastMode = undefined

    /**
     * Holds the font size of the CodeMirror instance
     *
     * @var {Number}
     */
    this._fontsize = 100

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
    pasteImagesHook(this._instance)
    matchStyleHook(this._instance)
    indentLinesHook(this._instance)
    headingClassHook(this._instance)
    codeblockClassHook(this._instance)
    zoomHook(this._instance)
    muteLinesHook(this._instance)
    renderElementsHook(this._instance)
    typewriterHook(this._instance)
    initiateTablesHook(this._instance)
    autocompleteHook(this._instance)
    linkTooltipsHook(this._instance)

    // As a last step, listen to the change and click events, as this
    // is what will be needed by the holding instance to determine
    // the state (e.g. clean vs. dirty, word counts etc)
    this._instance.on('change', (cm, changeObj) => {
      const newTextString = changeObj.text.join(' ')
      const changeOrigin = changeObj.origin
      const newTextCharCount = countWords(newTextString, true)
      const newTextWordCount = countWords(newTextString, false)
      this.emit('change', changeOrigin, newTextCharCount, newTextWordCount)
    })

    // Propagate the cursorActivity event to the calling process
    this._instance.on('cursorActivity', (cm) => {
      this.emit('cursorActivity')
    })

    this._instance.on('mousedown', (cm, event) => {
      // Open links on both Cmd and Ctrl clicks - otherwise stop handling event
      if (process.platform === 'darwin' && !event.metaKey) return true
      if (process.platform !== 'darwin' && !event.ctrlKey) return true

      event.preventDefault()
      event.codemirrorIgnore = true

      let cursor = this._instance.coordsChar({ left: event.clientX, top: event.clientY })
      let tokenInfo = this._instance.getTokenAt(cursor)
      let tokenList = tokenInfo.type.split(' ')

      if (tokenList.includes('zkn-link')) {
        this.emit('zettelkasten-link', tokenInfo.string)
      } else if (tokenList.includes('zkn-tag')) {
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
  } // END CONSTRUCTOR

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
    this._instance.scrollIntoView({
      from: {
        line: line,
        ch: 0
      },
      to: {
        line: line + viewportSize,
        ch: 0
      }
    })
  }

  /**
   * Alter the font size of the editor.
   * @param  {Number} direction The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
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
    this._instance.getWrapperElement().style.fontSize = this._fontsize + '%'
    this._instance.refresh()
  }

  /**
   * Sets the current options with a new options object, which will be merged
   *
   * @param   {Object}  newOptions  The new options
   */
  setOptions (newOptions) {
    // First, merge the new options into the CodeMirror options
    this._cmOptions = safeAssign(newOptions, this._cmOptions)

    if (newOptions.hasOwnProperty('zettlr') && newOptions.zettlr.hasOwnProperty('render')) {
      // If this property is set this mostly means that the rendering preferences
      // have changed. We need to remove all text markers so that only those
      // that are wanted are re-rendered. This will always execute on preferences
      // setting until we have established some cool "what has actually changed?"
      // indication in the settings provider, but this should not be too annoying.

      // DEBUG: This function is always called during document swap which
      // increases load time and induces a significant visual lag.
      // Right now it seems prudent to simply leave "unwanted" markers in place.
      // TODO: Devise a better mechanism of value caching to determine which
      // marks need to be removed, and only do so when one of the values have
      // indeed changed.

      // const markers = this._instance.doc.getAllMarks()
      // for (let marker of markers) {
      //   marker.clear()
      // }
    }

    // Second, set all options on the CodeMirror instance. This will internally
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
   * @param   {Doc}  cmDoc  The CodeMirror document instance
   *
   * @return  {Doc}         The previous CodeMirror document instance
   */
  swapDoc (cmDoc) {
    let oldDoc = this._instance.swapDoc(cmDoc)
    CodeMirror.signal(this._instance, 'cursorActivity', this._instance)
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

  /* * * * * * * * * * * *
   * GETTERS AND SETTERS *
   * * * * * * * * * * * */

  /**
   * This function builds a table of contents based on the editor contents
   *
   * @return {Array} An array containing objects with all headings
   */
  get tableOfContents () {
    let toc = []

    let lines = this.value.split('\n')

    let inCodeBlock = false
    let inYamlFrontMatter = lines[0] === '---'
    for (let i = 0; i < lines.length; i++) {
      if (inYamlFrontMatter && [ '...', '---' ].includes(lines[i])) {
        inYamlFrontMatter = false
        continue
      }

      if (inYamlFrontMatter && ![ '...', '---' ].includes(lines[i])) {
        continue
      }

      if (/^\s*`{3,}/.test(lines[i])) {
        inCodeBlock = !inCodeBlock
        continue
      }

      if (inCodeBlock && !/^\s*`{3,}$/.test(lines[i])) {
        continue
      }

      // Now that invalid sections are out of the way, test for a heading
      if (/^#{1,6} /.test(lines[i])) {
        toc.push({
          'line': i,
          // From the line remove both the heading indicators and optional ending classes
          'text': lines[i].replace(/^#{1,6} /, '').replace(/\{.*\}$/, ''),
          'level': (lines[i].match(/^(#+)/) || [ [], [] ])[1].length
        })
      }
    }

    // Now add the renderedLevel property to each toc entry
    let h1 = 0
    let h2 = 0
    let h3 = 0
    let h4 = 0
    let h5 = 0
    let h6 = 0
    for (let entry of toc) {
      switch (entry.level) {
        case 1:
          h1++
          h2 = h3 = h4 = h5 = h6 = 0
          entry.renderedLevel = h1
          break
        case 2:
          h2++
          h3 = h4 = h5 = h6 = 0
          entry.renderedLevel = [ h1, h2 ].join('.')
          break
        case 3:
          h3++
          h4 = h5 = h6 = 0
          entry.renderedLevel = [ h1, h2, h3 ].join('.')
          break
        case 4:
          h4++
          h5 = h6 = 0
          entry.renderedLevel = [ h1, h2, h3, h4 ].join('.')
          break
        case 5:
          h5++
          h6 = 0
          entry.renderedLevel = [ h1, h2, h3, h4, h5 ].join('.')
          break
        case 6:
          h6++
          entry.renderedLevel = [ h1, h2, h3, h4, h5, h6 ].join('.')
          break
      }
    }

    return toc
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

    if (this._fontsize !== 100) {
      this._instance.getWrapperElement().style.fontSize = this._fontsize + '%'
    }

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
    return countWords(this.value.replace(/[\s ]+/g, ''), true)
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
