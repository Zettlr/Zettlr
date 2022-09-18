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
 * APIs
 */
import EventEmitter from 'events'

import { EditorView, keymap, lineNumbers, drawSelection } from '@codemirror/view'
import { EditorState, Extension, Prec } from '@codemirror/state'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { StreamLanguage, indentOnInput, bracketMatching, indentUnit, codeFolding, foldGutter } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { json } from '@codemirror/legacy-modes/mode/javascript'
import {
  getSearchQuery,
  search,
  // searchKeymap,
  SearchQuery,
  setSearchQuery,
  findNext,
  findPrevious,
  replaceNext as _replaceNext,
  replaceAll as _replaceAll
} from '@codemirror/search'
import { closeBrackets, completionKeymap } from '@codemirror/autocomplete'

import safeAssign from '@common/util/safe-assign'

import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from './highlight/get-syntax-highlighter'
import markdownParser from './parser/markdown-parser'
import { charCountField, charCountNoSpacesField, mdStatistics, wordCountField } from './plugins/statistics-fields'

// Renderer plugins
import { initRenderers, reconfigureRenderers } from './renderers'
import { syntaxExtensions } from './parser/syntax-extensions'
import { ToCEntry, tocField } from './plugins/toc-field'
import { autocomplete, citekeyUpdate, filesUpdate, tagsUpdate, snippetsUpdate } from './autocomplete'

// Import the hook that keeps the local documents in sync with the central truth
import { hookDocumentAuthority } from './plugins/remote-doc'

// Main configuration
import { configField, configUpdateEffect, EditorConfigOptions, EditorConfiguration, getDefaultConfig } from './util/configuration'
import { Update } from '@codemirror/collab'
import { readabilityMode } from './plugins/readability'
import { customKeymap } from './commands/keymap'
import { typewriter } from './plugins/typewriter'
import { footnoteHover, formattingToolbar } from './tooltips'
import { DocumentType } from '@dts/common/documents'
import { pasteHandler } from './plugins/paste-handlers'

export interface DocumentWrapper {
  path: string
  state: EditorState
  type: DocumentType
}

/**
 * This is basically the old Codemirror 5 way of representing positions. While
 * Codemirror 6 is way more efficient describing everything as a string offset,
 * the line/ch representation makes a lot of sense for the users, so we keep
 * offering that here.
 */
export interface UserReadablePosition {
  line: number
  ch: number
}

export interface DocumentInfo {
  words: number
  chars: number
  chars_wo_spaces: number
  cursor: UserReadablePosition
  selections: Array<{ anchor: UserReadablePosition, head: UserReadablePosition }>
}

export default class MarkdownEditor extends EventEmitter {
  private readonly _instance: EditorView
  private readonly fetchDoc: (filePath: string) => Promise<{ content: string, type: DocumentType, startVersion: number }>
  private readonly pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>
  private readonly pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  private config: EditorConfiguration

  /**
   * Creates a new MarkdownEditor instance attached to the anchorElement
   *
   * @param   {Element|DocumentFragment|undefined}  anchorElement   The anchor element (either a DOM node or an ID to be used with document.getElementById)
   * @param  {Function} getDocument Used to fetch initial document states from the document authority
   * @param  {Function} pullUpdates Used to pull new updates from the document authority
   * @param  {Function} pushUpdates Used to push new updates to the document authority
   */
  constructor (
    anchorElement: Element|DocumentFragment|undefined,
    getDocument: (path: string) => Promise<{ content: string, type: DocumentType, startVersion: number }>,
    pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>,
    pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  ) {
    super() // Set up the event emitter

    this.fetchDoc = getDocument
    this.pullUpdates = pullUpdates
    this.pushUpdates = pushUpdates

    // The following fields are used to cache certain values, especially since
    // they aren't retained during document swaps
    this.config = getDefaultConfig()

    // Every CM6 editor consists of two parts: First, a view that can display the
    // content (the equivalent of the former editor), and second a state, which
    // basically binds a set of extensions to a document (something that Marijn
    // has extracted from the main editor).
    // Thus, we can basically immediately start the editor, but leave the state
    // undefined. swapDoc() can then be achieved by calling setState.
    this._instance = new EditorView({
      state: undefined,
      parent: anchorElement
    })
  } // END CONSTRUCTOR

  private _getExtensions (filePath: string, type: DocumentType, startVersion: number): Extension[] {
    // First, instantiate with common extensions that all documents share
    const extensions: Extension[] = [
      // KEYMAPS
      keymap.of([
        ...defaultKeymap, // Minimal default keymap
        ...historyKeymap // , // History commands (redo/undo)
        // ...searchKeymap // Search commands (Ctrl+F, etc.)
      ]),
      // CODE FOLDING
      codeFolding(),
      foldGutter(),
      // HISTORY
      history(),
      // SELECTIONS
      // Overrides the default browser selection drawing, allows styling
      drawSelection({ drawRangeCursor: false, cursorBlinkRate: 0 }),
      EditorState.allowMultipleSelections.of(true),
      search({ top: true }), // Add a search
      // TAB SIZES/INDENTATION -> Depend on the configuration field
      EditorState.tabSize.from(configField, (val) => val.indentUnit),
      indentUnit.from(configField, (val) => val.indentWithTabs ? '\t' : ' '.repeat(val.indentUnit)),
      EditorView.lineWrapping, // Enable line wrapping

      // Add the configuration and preset it with whatever is in the cached
      // config.
      configField.init(state => JSON.parse(JSON.stringify(this.config))),

      // The updateListener is a custom extension we're using in order to be
      // able to emit events from this main class based on change events.
      EditorView.updateListener.of((update) => {
        // Listen for changes and emit events appropriately
        if (update.docChanged) {
          this.emit('change')
        }
        if (update.focusChanged && this._instance.hasFocus) {
          this.emit('focus')
        }
        if (update.selectionSet) {
          this.emit('cursorActivity')
        }
      }),

      // Enables the editor to fetch updates to the document from main
      hookDocumentAuthority(filePath, startVersion, this.pullUpdates, this.pushUpdates)
    ]

    // Extensions only required for code files, but not for Markdown files
    const codeExtensions: Extension[] = [
      lineNumbers(),
      closeBrackets(),
      bracketMatching(),
      indentOnInput(),
      codeSyntaxHighlighter()
    ]

    switch (type) {
      case DocumentType.Markdown:
        // Add Markdown-file specific extensions
        extensions.push(
          // We need our custom keymaps first
          keymap.of(completionKeymap),
          Prec.highest(keymap.of(customKeymap)),
          markdownParser(), // The parser generates the AST for the document ...
          markdownSyntaxHighlighter(), // ... which can then be styled with a highlighter
          syntaxExtensions, // Add our own specific syntax plugin
          initRenderers({
            renderImages: this.config.renderImages,
            renderLinks: this.config.renderLinks,
            renderMath: this.config.renderMath,
            renderTasks: this.config.renderTasks,
            renderHeadings: this.config.renderHeadings,
            renderCitations: this.config.renderCitations,
            renderMermaid: true
            // STILL TODO: Tables, Emphasis
          }),
          // Some statistics we need for Markdown documents
          mdStatistics,
          typewriter, // Typewriter mode
          tocField,
          autocomplete,
          readabilityMode,
          formattingToolbar,
          footnoteHover,
          pasteHandler // Manages image saving
        )
        break
      case DocumentType.JSON:
        extensions.push(StreamLanguage.define(json), ...codeExtensions)
        break
      case DocumentType.YAML:
        extensions.push(StreamLanguage.define(yaml), ...codeExtensions)
        break
      case DocumentType.LaTeX:
        extensions.push(StreamLanguage.define(stex), ...codeExtensions)
    }

    return extensions
  }

  /**
   * Swaps the current CodeMirror Document with a new one. NOTE: You have to load
   * the document first with sync().
   *
   * @param   {string}           documentPath         The document to switch to
   */
  async swapDoc (documentPath: string): Promise<void> {
    const { content, type, startVersion } = await this.fetchDoc(documentPath)

    // Update the metadata
    // this.setOptions({ metadata: { path: documentPath, id: '', library: 'main' } })

    const state = EditorState.create({
      doc: content,
      extensions: this._getExtensions(documentPath, type, startVersion)
    })

    this._instance.setState(state)

    // Determine if this is a code doc and add the corresponding class to the
    // outer content DOM so that we can style it.
    if (type === DocumentType.Markdown) {
      this._instance.contentDOM.classList.remove('code')
    } else {
      this._instance.contentDOM.classList.add('code')
    }

    this._instance.focus()
  }

  // SEARCH FUNCTIONALITY
  private maybeExchangeQuery (query: SearchQuery): void {
    const currentQuery = getSearchQuery(this._instance.state)
    if (!currentQuery.eq(query)) {
      console.log('Exchanging old search query!')
      this._instance.dispatch({ effects: setSearchQuery.of(query) })
    }
  }

  searchNext (query: SearchQuery): void {
    console.log('Searching next!', query)
    this.maybeExchangeQuery(query)
    console.log(findNext(this._instance))
  }

  searchPrevious (query: SearchQuery): void {
    this.maybeExchangeQuery(query)
    findPrevious(this._instance)
  }

  replaceNext (query: SearchQuery): void {
    this.maybeExchangeQuery(query)
    _replaceNext(this._instance)
  }

  replaceAll (query: SearchQuery): void {
    this.maybeExchangeQuery(query)
    _replaceAll(this._instance)
  }

  stopSearch (): void {}

  /**
   * Allows highlighting of arbitrary ranges independent of a search
   *
   * @param   {CodeMirror.Range[]}  ranges  The ranges to highlight
   */
  highlightRanges (ranges: any[]): void {} // TODO

  /**
   * Pastes the clipboard contents as plain text, regardless of any formatted
   * text present.
   */
  pasteAsPlainText (): void {}

  /**
   * Copies the current editor contents into the clipboard as HTML
   */
  copyAsHTML (): void {}

  /**
   * Small function that jumps to a specific line in the editor.
   *
   * @param  {number} line The line to pull into view
   */
  jtl (line: number): void {
    const lineDesc = this._instance.state.doc.line(line)
    this._instance.dispatch({
      selection: { anchor: lineDesc.from, head: lineDesc.to },
      effects: EditorView.scrollIntoView(lineDesc.from, { y: 'center' })
    })
    this._instance.focus()
  }

  /**
   * Moves the section that starts with an ATX heading on the from-line to the
   * line identified by to
   *
   * @param   {number}  from  The starting line (including the section heading)
   * @param   {number}  to    The target line for the section
   */
  moveSection (from: number, to: number): void {
    // TODO
  }

  /**
   * Updates the provided options for all currently loaded documents.
   *
   * @param   {Object}  newOptions  The new options
   */
  setOptions (newOptions: EditorConfigOptions): void {
    // Cache the current config here
    this.config = safeAssign(newOptions, this.config)
    // Apply the new options to the state

    // First: The configuration updates themselves. This will already update a
    // bunch of other facets and values (such as tab size and unit)
    this._instance.state.update({ effects: configUpdateEffect.of(newOptions) })

    // Second: The renderers
    reconfigureRenderers(this._instance, {
      renderImages: this.config.renderImages,
      renderLinks: this.config.renderLinks,
      renderMath: this.config.renderMath,
      renderTasks: this.config.renderTasks,
      renderHeadings: this.config.renderHeadings,
      renderCitations: this.config.renderCitations,
      renderMermaid: true
      // STILL TODO: Tables, Emphasis
    })
  }

  /**
   * Returns an option with the given name as it is configured on the instance.
   *
   * @param   {string}  name  The name of the key to request
   *
   * @return  {any}           The value of the key
   */
  getOption (name: string): any {
    const config = this._instance.state.field(configField)
    if (name in config) {
      return config[name as keyof EditorConfiguration]
    }
  }

  /**
   * Runs a command on the underlying CodeMirror instance
   *
   * @param   {String}  cmd  The command to run
   */
  runCommand (cmd: string): void {
    // TODO
  }

  /**
   * Issues a focus command to the underlying instance
   */
  focus (): void {
    this._instance.focus()
  }

  /**
   * Whether the underlying Codemirror instance is currently focused
   *
   * @return  {boolean} The focus status
   */
  hasFocus (): boolean {
    return this._instance.hasFocus
  }

  /**
   * Sets an autocomplete database of given type to a new value
   *
   * @param   {String}  type      The type of the database
   * @param   {Object}  database  The show-hint-addon compatible database
   */
  setCompletionDatabase (type: 'tags', database: string[]): void
  setCompletionDatabase (type: 'citations', database: Array<{ citekey: string, displayText: string }>): void
  setCompletionDatabase (type: 'snippets', database: Array<{ name: string, content: string }>): void
  setCompletionDatabase (type: 'files', database: Array<{ filename: string, id: string }>): void
  setCompletionDatabase (type: string, database: any): void {
    switch (type) {
      case 'tags':
        this._instance.dispatch({ effects: tagsUpdate.of(database) })
        break
      case 'citations':
        this._instance.dispatch({ effects: citekeyUpdate.of(database) })
        break
      case 'snippets':
        this._instance.dispatch({ effects: snippetsUpdate.of(database) })
        break
      case 'files':
        this._instance.dispatch({ effects: filesUpdate.of(database) })
        break
    }
  }

  /**
   * Updates the list of available snippets.
   */
  async updateSnippetAutocomplete (): Promise<void> {
  }

  /* * * * * * * * * * * *
   * GETTERS AND SETTERS *
   * * * * * * * * * * * */

  /**
   * This function builds a table of contents based on the editor contents
   *
   * @return {Array} An array containing objects with all headings
   */
  get tableOfContents (): ToCEntry[]|undefined {
    return this._instance.state.field(tocField, false)
  }

  /**
   * Returns info about the editor instance
   *
   * @return  {Object}  An object containing, e.g., words, chars, selections.
   */
  get documentInfo (): DocumentInfo {
    // First, we need the main selection's main offset in the document and
    // compute the correct line number for that offset, in order to arrive at
    // a cursor position.
    const mainOffset = this._instance.state.selection.main.from
    const line = this._instance.state.doc.lineAt(mainOffset)
    return {
      words: this.wordCount ?? 0,
      chars: this.charCount ?? 0,
      chars_wo_spaces: this.charCountWithoutSpaces ?? 0,
      cursor: { line: line.number, ch: mainOffset - line.from + 1 }, // Chars are still zero-based
      selections: this._instance.state.selection.ranges
      // Remove cursor-only positions (range must have a length)
        .filter(sel => sel.anchor !== sel.head)
        // Then map to user readable ranges
        .map(sel => {
          // Analogous to how we determine the cursor position we do it here for
          // each selection present.
          const anchorLine = this._instance.state.doc.lineAt(sel.anchor)
          const headLine = this._instance.state.doc.lineAt(sel.head)
          return {
            anchor: { line: anchorLine.number, ch: sel.anchor - anchorLine.from },
            head: { line: headLine.number, ch: sel.head - headLine.from }
          }
        })
    }
  }

  /**
   * Should the editor return char counts instead of word counts where appropriate?
   *
   * @param   {boolean}  shouldCountChars  The value
   */
  set countChars (shouldCountChars: boolean) {
  }

  /**
   * Returns whether the editor returns char counts in appropriate places.
   *
   * @return  {boolean}  Whether the editor counts chars or words.
   */
  get countChars (): boolean {
    return false // TODO
  }

  /**
   * Whether the editor is in fullscreen mode
   *
   * @return  {Boolean}  True if the editor option for fullScreen is set
   */
  get isFullscreen (): boolean {
    return false // TODO
  }

  /**
   * Enters or exits the editor fullscreen mode
   *
   * @param   {Boolean}  shouldBeFullscreen  Whether the editor should be in fullscreen
   */
  set isFullscreen (shouldBeFullscreen: boolean) {
  }

  /**
   * Whether the editor is currently in typewriter
   *
   * @return  {Boolean}  True if typewriter mode is active
   */
  get hasTypewriterMode (): boolean {
    return false // TODO
  }

  /**
   * Activates or deactivates typewriter mode
   *
   * @param   {Boolean}  shouldBeTypewriter  True or False
   */
  set hasTypewriterMode (shouldBeTypewriter: boolean) {
  }

  /**
   * Determines whether the editor is in distraction free mode
   *
   * @return  {boolean}  True or false
   */
  get distractionFree (): boolean {
    return false // TODO
  }

  /**
   * Sets the editor into or out of distraction free
   *
   * @param   {boolean}  shouldBeFullscreen  Whether the editor should be in distraction free
   */
  set distractionFree (shouldBeFullscreen: boolean) {
  }

  /**
   * Returns whether or not the readability mode is currently active
   *
   * @return  {boolean}  True if the readability mode is active
   */
  get readabilityMode (): boolean {
    return false // TODO
  }

  /**
   * Sets the readability mode
   *
   * @param   {boolean}  shouldBeReadability  Whether or not the mode should be active
   */
  set readabilityMode (shouldBeReadability: boolean) {
  }

  /**
   * Whether the instance is currently readonly
   *
   * @return  {Boolean}  True if users cannot edit the contents
   */
  get readOnly (): boolean {
    return this._instance.state.readOnly
  }

  /**
   * Sets the readonly flag on the instance
   *
   * @param   {Boolean}  shouldBeReadonly  Whether the editor contents should be readonly
   */
  set readOnly (shouldBeReadonly: boolean) {
    this._instance.state.update({
      // effects: EditorState.readOnly.of(shouldBeReadonly) // TODO figure out properly
    })
  }

  /**
   * Returns the current contents of the editor
   *
   * @return  {String}  The editor contents
   */
  get value (): string {
    return [...this._instance.state.doc.iterLines()].join('\n')
  }

  /**
   * Returns the outer DOM element for the editor instance
   *
   * @return  {HTMLElement}The editor wrapper
   */
  get dom (): HTMLElement {
    return this._instance.dom
  }

  /**
   * Returns the word count of the editor contents
   *
   * @return  {Number}  The word count
   */
  get wordCount (): number|undefined {
    return this._instance.state.field(wordCountField, false)
  }

  /**
   * Returns the char count of the editor contents
   *
   * @return  {Number}  The number of characters
   */
  get charCount (): number|undefined {
    return this._instance.state.field(charCountField, false)
  }

  /**
   * Return the amount of characters without spaces
   *
   * @return  {Number}  The number of chars without spaces
   */
  get charCountWithoutSpaces (): number|undefined {
    return this._instance.state.field(charCountNoSpacesField, false)
  }
}
