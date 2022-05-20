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
import './editor.less'

/**
 * UTILITY FUNCTIONS
 */

import getCodeMirrorDefaultOptions from './get-cm-options'
import safeAssign from '@common/util/safe-assign'
import countWords from '@common/util/count-words'
import { getConverter } from '@common/util/md-to-html'
import generateKeymap from './generate-keymap'
import generateTableOfContents from './util/generate-toc'

// Search plugin (module-namespaced set of utility functions)
import { searchNext, searchPrevious, replaceNext, replacePrevious, replaceAll, stopSearch, highlightRanges } from './plugins/search'

/**
 * APIs
 */
import EventEmitter from 'events'

/**
 * CODEMIRROR & DEPENDENCIES
 */
import './load-plugins'
import CodeMirror, { fromTextArea } from 'codemirror'

/**
 * HOOKS (plugins that hook on to event listeners)
 */
import dropFilesHook from './hooks/drop-files'
import footnotesHook from './hooks/footnotes'
import formattingBarHook from './hooks/formatting-bar'
import pasteImagesHook from './hooks/paste-images'
import matchStyleHook from './hooks/match-style'
import { indentLinesHook, clearLineIndentationCache } from './hooks/indent-wrapped-lines'
import headingClassHook from './hooks/heading-classes'
import codeblockClassHook from './hooks/codeblock-classes'
import taskItemClassHook from './hooks/task-item-classes'
import muteLinesHook from './hooks/mute-lines'
import renderElementsHook from './hooks/render-elements'
import typewriterHook from './hooks/typewriter'
import { autocompleteHook, setAutocompleteDatabase } from './hooks/autocomplete'
import linkTooltipsHook from './hooks/link-tooltips'
import noteTooltipsHook from './hooks/note-preview'

import displayContextMenu from './display-context-menu'

const ipcRenderer = window.ipc
const clipboard = window.clipboard

export default class MarkdownEditor extends EventEmitter {
  private readonly _instance: CodeMirror.Editor
  private readonly _anchorElement: null|HTMLTextAreaElement
  private _readabilityMode: boolean
  private _currentDocumentMode: string
  private _cmOptions: any
  private _countChars: boolean
  private readonly _md2html: ReturnType<typeof getConverter>

  /**
   * Creates a new MarkdownEditor instance attached to the anchorElement
   *
   * @param   {HTMLTextAreaElement|string}  anchorElement   The anchor element (either a DOM node or an ID to be used with document.getElementById)
   * @param   {Object}                      [cmOptions={}]  Optional CodeMirror options. If no object is provided, the instance will be instantiated with default options for Zettlr.
   */
  constructor (anchorElement: HTMLTextAreaElement|string, cmOptions = {}) {
    super() // Set up the event emitter
    this._anchorElement = null
    this._readabilityMode = false
    this._currentDocumentMode = 'multiplex'
    this._cmOptions = getCodeMirrorDefaultOptions(this)
    this._countChars = false

    this._md2html = getConverter(window.getCitation)

    // Parse the anchorElement until we get something useful
    if (typeof anchorElement === 'string' && document.getElementById(anchorElement) !== null) {
      const anchor = document.getElementById(anchorElement)
      if (anchor instanceof HTMLTextAreaElement) {
        this._anchorElement = anchor
      } else {
        throw new Error('Could not instantiate MarkdownEditor: anchorElement did not describe an HTMLTextAreaElement')
      }
    } else if (anchorElement instanceof HTMLTextAreaElement) {
      this._anchorElement = anchorElement
    } else {
      throw new Error(`Could not instantiate MarkdownEditor: anchorElement must be an ID or a DOM node (received: ${typeof anchorElement})`)
    }

    // Now, instantiate CodeMirror with the defaults
    this._instance = fromTextArea(this._anchorElement, this._cmOptions)

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
        ;(event as any).codemirrorIgnore = true
        this.emit('zettelkasten-link', tokenInfo.string)
      } else if (tokenList.includes('zkn-tag')) {
        event.preventDefault()
        ;(event as any).codemirrorIgnore = true
        this.emit('zettelkasten-tag', tokenInfo.string)
      } else if (event.target !== null) {
        // It could be that it's a frontmatter tag. In that case, we shouldn't
        // check the tokenType, but rather class names
        if ((event.target as HTMLElement).classList.contains('zkn-tag')) {
          event.preventDefault()
          ;(event as any).codemirrorIgnore = true
          this.emit('zettelkasten-tag', `#${(event.target as HTMLElement).textContent as string}`)
        }
      }
    })

    // Display a context menu if appropriate
    this._instance.getWrapperElement().addEventListener('contextmenu', (event) => {
      const shouldSelectWordUnderCursor = displayContextMenu(event, this._instance.isReadOnly(), (command: string) => {
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
      }, (wordToReplace: string) => {
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

    // Since themes use different fonts, we need to clear the indentation cache
    ipcRenderer.on('config-provider', (event, { command, payload }) => {
      if (command === 'update' && payload === 'display.theme') {
        clearLineIndentationCache()
        this._instance.refresh()
      }
    })

    // The same holds true for custom CSS (not necessarily, but the user won't
    // play around that much with custom CSS)
    ipcRenderer.on('css-provider', (event, { command }) => {
      if (command === 'custom-css-updated') {
        clearLineIndentationCache()
        this._instance.refresh()
      }
    })

    // Initial retrieval of snippets
    this.updateSnippetAutocomplete().catch(err => console.error(err))
  } // END CONSTRUCTOR

  // SEARCH FUNCTIONALITY
  searchNext (term: string): void {
    searchNext(this._instance, term)
  }

  searchPrevious (term: string): void {
    searchPrevious(this._instance, term)
  }

  replaceNext (term: string, replacement: string): void {
    replaceNext(this._instance, term, replacement)
  }

  replacePrevious (term: string, replacement: string): void {
    replacePrevious(this._instance, term, replacement)
  }

  replaceAll (term: string, replacement: string): void {
    replaceAll(this._instance, term, replacement)
  }

  stopSearch (): void {
    stopSearch()
  }

  /**
   * Allows highlighting of arbitrary ranges independent of a search
   *
   * @param   {CodeMirror.Range[]}  ranges  The ranges to highlight
   */
  highlightRanges (ranges: CodeMirror.Range[]): void {
    this.stopSearch() // Make sure we retain a sane search state
    highlightRanges(this._instance, ranges)
  }

  /**
   * Pastes the clipboard contents as plain text, regardless of any formatted
   * text present.
   */
  pasteAsPlainText (): void {
    const plainText = clipboard.readText()

    // Simple programmatical paste.
    if (plainText.length > 0) {
      this._instance.replaceSelection(plainText)
    }
  }

  /**
   * Copies the current editor contents into the clipboard as HTML
   */
  copyAsHTML (): void {
    if (!this._instance.somethingSelected()) return
    let md = this._instance.getSelections().join(' ')
    let html = this._md2html(md)
    // Write both the HTML and the Markdown
    // (as fallback plain text) to the clipboard
    clipboard.write({ 'text': md, 'html': html })
  }

  /**
   * Small function that jumps to a specific line in the editor.
   *
   * @param  {number} line The line to pull into view
   * @param {boolean} setCursor If set to true, will also change the cursor position to line
   */
  jtl (line: number, setCursor: boolean = false): void {
    const { from, to } = this._instance.getViewport()
    const viewportSize = to - from
    // scrollIntoView first and foremost pulls something simply into view, but
    // we want it to be at the top of the window as expected by the user, so
    // we need to pull in a full viewport, beginning at the corresponding line
    // and expanding unto one full viewport size.
    let lastLine = line + viewportSize

    // CodeMirror will not sanitise the viewport size.
    if (lastLine >= this._instance.lineCount()) {
      lastLine = this._instance.lineCount() - 1
    }

    this._instance.scrollIntoView({
      from: { line: line, ch: 0 },
      to: { line: lastLine, ch: 0 }
    })

    if (setCursor) {
      console.log('Setting cursor!')
      this._instance.setCursor({ line: line, ch: 0 })
      this._instance.focus()
    }
  }

  /**
   * Sets the current options with a new options object, which will be merged
   *
   * @param   {Object}  newOptions  The new options
   */
  setOptions (newOptions: any): void {
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
      const markers = this._instance.getAllMarks()
      for (const marker of markers) {
        marker.clear()
      }
    }

    // Now, we can safely merge the options
    this._cmOptions = safeAssign(newOptions, this._cmOptions)

    // Next, set all options on the CodeMirror instance. This will internally
    // fire all necessary events, apart from those we need to fire manually.
    for (const name in this._cmOptions) {
      if (name in this._cmOptions) {
        (this._instance as any).setOption(name, this._cmOptions[name])
      }
    }

    // Perform any after-option-setting-stuff
    this._instance.setOption('extraKeys', generateKeymap())

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
  getOption (name: string): any {
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
  swapDoc (cmDoc: CodeMirror.Doc, documentMode: string): CodeMirror.Doc {
    const oldDoc = this._instance.swapDoc(cmDoc)
    this._instance.focus()

    // Rarely, the heading classes will confuse the CodeMirror instance so that
    // selections will still be of the old line height's size, instead of the
    // new, bigger one. Since window resizing apparently helps, we'll manually
    // call said function here (after a timeout to give the hooks time to run)
    setTimeout(() => { this._instance.refresh() }, 1000)

    this._currentDocumentMode = documentMode

    if (!this.readabilityMode) {
      this.setOptions({ mode: this._currentDocumentMode })
    } else {
      this.setOptions({ mode: 'readability' })
    }

    return oldDoc
  }

  /**
   * Whether the instance is currently considered "clean"
   *
   * @return  {Boolean}  True, if no changes are recorded
   */
  isClean (): boolean {
    return this._instance.isClean()
  }

  /**
   * Runs a command on the underlying CodeMirror instance
   *
   * @param   {String}  cmd  The command to run
   */
  runCommand (cmd: string): void {
    this._instance.execCommand(cmd)
  }

  /**
   * Issues a focus command to the underlying instance
   */
  focus (): void {
    this._instance.focus()
  }

  /**
   * Sets an autocomplete database of given type to a new value
   *
   * @param   {String}  type      The type of the database
   * @param   {Object}  database  The show-hint-addon compatible database
   */
  setCompletionDatabase (type: string, database: any): void {
    setAutocompleteDatabase(type, database)
  }

  /**
   * Updates the list of available snippets.
   */
  async updateSnippetAutocomplete (): Promise<void> {
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
  get tableOfContents (): any[] {
    return generateTableOfContents(this.value)
  }

  /**
   * Returns info about the editor instance
   *
   * @return  {Object}  An object containing, e.g., words, chars, selections.
   */
  get documentInfo (): any {
    const ret = {
      words: this.wordCount,
      chars: this.charCount,
      chars_wo_spaces: this.charCountWithoutSpaces,
      cursor: Object.assign({}, this._instance.getCursor()),
      selections: [] as any[]
    }

    if (this._instance.somethingSelected()) {
      // Write all selections into the file info object
      let selectionText = this._instance.getSelections()
      let selectionBounds = this._instance.listSelections()
      for (let i = 0; i < selectionText.length; i++) {
        // const start = selectionBounds[i].anchor > selectionBounds[i].head
        ret.selections.push({
          selectionLength: countWords(selectionText[i], this._countChars),
          start: Object.assign({}, selectionBounds[i].anchor),
          end: Object.assign({}, selectionBounds[i].head)
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
  set countChars (shouldCountChars: boolean) {
    this._countChars = shouldCountChars
  }

  /**
   * Returns whether the editor returns char counts in appropriate places.
   *
   * @return  {boolean}  Whether the editor counts chars or words.
   */
  get countChars (): boolean {
    return this._countChars
  }

  /**
   * Whether the editor is in fullscreen mode
   *
   * @return  {Boolean}  True if the editor option for fullScreen is set
   */
  get isFullscreen (): boolean {
    return this._cmOptions.fullScreen
  }

  /**
   * Enters or exits the editor fullscreen mode
   *
   * @param   {Boolean}  shouldBeFullscreen  Whether the editor should be in fullscreen
   */
  set isFullscreen (shouldBeFullscreen: boolean) {
    this.setOptions({ 'fullScreen': shouldBeFullscreen })

    // Refresh to reflect the size changes
    this._instance.refresh()
  }

  /**
   * Whether the editor is currently in typewriter
   *
   * @return  {Boolean}  True if typewriter mode is active
   */
  get hasTypewriterMode (): boolean {
    return this._cmOptions.zettlr.typewriterMode
  }

  /**
   * Activates or deactivates typewriter mode
   *
   * @param   {Boolean}  shouldBeTypewriter  True or False
   */
  set hasTypewriterMode (shouldBeTypewriter: boolean) {
    this.setOptions({ 'zettlr': { 'typewriterMode': shouldBeTypewriter } })
  }

  /**
   * Determines whether the editor is in distraction free mode
   *
   * @return  {boolean}  True or false
   */
  get distractionFree (): boolean {
    return this._cmOptions.fullScreen
  }

  /**
   * Sets the editor into or out of distraction free
   *
   * @param   {boolean}  shouldBeFullscreen  Whether the editor should be in distraction free
   */
  set distractionFree (shouldBeFullscreen: boolean) {
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
  get readabilityMode (): boolean {
    return this._readabilityMode
  }

  /**
   * Sets the readability mode
   *
   * @param   {boolean}  shouldBeReadability  Whether or not the mode should be active
   */
  set readabilityMode (shouldBeReadability: boolean) {
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
  get readOnly (): boolean {
    return this._cmOptions.readOnly
  }

  /**
   * Sets the readonly flag on the instance
   *
   * @param   {Boolean}  shouldBeReadonly  Whether the editor contents should be readonly
   */
  set readOnly (shouldBeReadonly: boolean) {
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
  get value (): string {
    return this._instance.getValue()
  }

  /**
   * Returns the word count of the editor contents
   *
   * @return  {Number}  The word count
   */
  get wordCount (): number {
    return countWords(this.value, false)
  }

  /**
   * Returns the char count of the editor contents
   *
   * @return  {Number}  The number of characters
   */
  get charCount (): number {
    return countWords(this.value, true)
  }

  /**
   * Return the amount of characters without spaces
   *
   * @return  {Number}  The number of chars without spaces
   */
  get charCountWithoutSpaces (): number {
    return countWords(this.value, 'nospace')
  }

  /**
   * Returns the underlying CodeMirror instance
   *
   * @return  {CodeMirror.Editor}  The CodeMirror instance
   */
  get codeMirror (): CodeMirror.Editor {
    return this._instance
  }
}
