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

// CodeMirror imports
import { EditorView } from '@codemirror/view'
import {
  EditorState,
  Text,
  type StateEffect,
  type Extension,
  type SelectionRange,
  type EditorSelection
} from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'

// Keymaps/Input modes
import { emacs } from '@replit/codemirror-emacs'
import { vimPlugin } from './plugins/vim-mode'

import { type ToCEntry, tocField } from './plugins/toc-field'
import {
  citekeyUpdate,
  filesUpdate,
  tagsUpdate,
  snippetsUpdate
} from './autocomplete'

// Main configuration
import {
  type CoreExtensionOptions,
  getJSONExtensions,
  getMarkdownExtensions,
  getTexExtensions,
  getYAMLExtensions,
  inputModeCompartment,
  getMainEditorThemes
} from './editor-extension-sets'

import {
  configField,
  configUpdateEffect,
  getDefaultConfig,
  type EditorConfigOptions,
  type EditorConfiguration
} from './util/configuration'

// Custom commands
import {
  applyComment,
  applyTaskList,
  insertImage,
  insertLink
} from './commands/markdown'
import { addNewFootnote } from './commands/footnotes'

// Utilities
import { copyAsHTML, pasteAsPlain } from './util/copy-paste-cut'
import openMarkdownLink from './util/open-markdown-link'
import { highlightRangesEffect } from './plugins/highlight-ranges'

import safeAssign from '@common/util/safe-assign'
import { countAll } from '@common/util/counter'
import { DocumentType } from '@dts/common/documents'
import { type TagRecord } from '@providers/tags'
import {
  reloadStateEffect,
  type PullUpdateCallback,
  type PushUpdateCallback
} from './plugins/remote-doc'
import { markdownToAST } from '../markdown-utils'
import { countField } from './plugins/statistics-fields'
import type { SyntaxNode } from '@lezer/common'
import { darkModeEffect } from './theme/dark-mode'
import { editorMetadataFacet } from './plugins/editor-metadata'
import { projectInfoUpdateEffect, type ProjectInfo } from './plugins/project-info-field'

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
  cursor: UserReadablePosition
  selections: Array<{
    anchor: UserReadablePosition
    head: UserReadablePosition
    words: number
    chars: number
  }>
}

export type FetchDoc = (filePath: string) => Promise<{ content: string, type: DocumentType, startVersion: number }>

/**
 * This interface is used to provide the editor with an API of where to fetch
 * the documents from. The remote could be, e.g., either behind a websocket or
 * an IPC bridge.
 */
export interface DocumentAuthorityAPI {
  /**
   * Used to fetch the document from the document authority
   */
  fetchDoc: FetchDoc
  /**
   * Used to pull new updates from the document authority
   */
  pullUpdates: PullUpdateCallback
  /**
   * Used to push updates to the document authority
   */
  pushUpdates: PushUpdateCallback
}

/**
 * This interface describes a persistent state for the EditorView, meaning some
 * state that should survive destruction and re-instantiation of the same
 * EditorView. It holds information that should be restored during, e.g.,
 * switching tabs, which includes a scroll snapshot and the selection(s). By
 * passing this information to a new MarkdownEditor instance, the editor can
 * restore this quickly. The caller/manager of a set of MarkdownEditor instances
 * should keep track of these, and extract them from the MarkdownEditor instance
 * before unmounting it, e.g., via a Map.
 */
export interface EditorViewPersistentState {
  /**
   * A scroll snapshot from the editor. Used to properly restore the scroll
   * position.
   */
  scrollSnapshot: StateEffect<any>
  /**
   * A selection object. Used to properly restore the cursor position and any
   * selections within the editor.
   */
  selection: EditorSelection
}

export default class MarkdownEditor extends EventEmitter {
  /**
   * The underlying CodeMirror view
   *
   * @var {EditorView}
   */
  private readonly _instance: EditorView
  /**
   * The absolute path to the document represented by this MainEditor instance.
   *
   * @var {string}
   */
  private readonly representedDocument: string
  /**
   * The API method used to synchronize the document with an authority.
   *
   * @var {DocumentAuthorityAPI}
   */
  private readonly authority: DocumentAuthorityAPI
  /**
   * The full editor configuration
   *
   * @var {EditorConfiguration}
   */
  private config: EditorConfiguration

  /**
   * The database cache for the various autocompletes.
   *
   * @var {any}
   */
  private readonly databaseCache: {
    tags: TagRecord[]
    citations: Array<{ citekey: string, displayText: string }>
    snippets: Array<{ name: string, content: string }>
    files: Array<{ filename: string, displayName: string, id: string }>
  }

  /**
   * Creates a new MarkdownEditor instance associated with the given leafId and
   * the representedDocument. Immediately after instantiation the editor will
   * pull the document from the given authorityAPI and set it up.
   *
   * NOTE that you will have to append the resulting editor DOM element onto the
   * DOM tree yourself in order for the editor to actually show up. Example:
   *
   * ```ts
   * const editor = new MarkdownEditor(leafId, filePath, api)
   * const container = document.getElementById('container')
   * container.appendChild(editor.dom)
   * ```
   *
   * @param  {string}                leafId               The ID of the leaf
   *                                                      this editor is part of
   * @param  {string}                windowId             The window's ID
   * @param  {string}                representedDocument  The absolute path to
   *                                                      the file that will be
   *                                                      loaded in this editor
   * @param  {DocumentAuthorityAPI}  authorityAPI         The authority API this
   *                                                      editor should use.
   *                                                      Should normally be the
   *                                                      IPC authority.
   */
  constructor (
    readonly leafId: string,
    readonly windowId: string,
    representedDocument: string,
    authorityAPI: DocumentAuthorityAPI,
    configOverride?: Partial<EditorConfiguration>,
    persistentState?: EditorViewPersistentState
  ) {
    super() // Set up the event emitter

    this.authority = authorityAPI
    this.representedDocument = representedDocument

    // Since the editor state needs to be rebuilt from scratch sometimes, we
    // cache the autocomplete databases so that we don't have to re-fetch them
    // everytime.
    this.databaseCache = { tags: [], citations: [], snippets: [], files: [] }

    // Same goes for the config
    this.config = getDefaultConfig()
    // TODO: This is bad style imho
    this.config.metadata.path = representedDocument
    if (configOverride !== undefined) {
      this.setOptions(configOverride)
    }

    // Create the editor ...
    this._instance = new EditorView({
      state: undefined,
      parent: undefined
    })

    // ... and immediately begin loading the document
    this.loadDocument(persistentState).catch(err => console.error(err))
  }

  /**
   * Returns the correct set of extensions for the given document
   *
   * @param   {string}        filePath      The file path
   * @param   {DocumentType}  type          The type of file we're dealing with
   * @param   {number}        startVersion  The initial synchronization number
   *
   * @return  {Extension[]}                 The extension set
   */
  private _getExtensions (filePath: string, type: DocumentType, startVersion: number): Extension[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const editorInstance = this

    const options: CoreExtensionOptions = {
      initialConfig: JSON.parse(JSON.stringify(this.config)),
      remoteConfig: {
        filePath,
        startVersion,
        pullUpdates: this.authority.pullUpdates,
        pushUpdates: this.authority.pushUpdates
      },
      updateListener: (update) => {
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

        // Listen for config updates, and parse them into the internal cache. We
        // do it this way, because the editor itself is also capable of changing
        // its configuration (e.g., via the statusbar). This way we ensure that
        // both external updates (via setOptions) as well as internal updates
        // both end up in our cache.
        for (const transaction of update.transactions) {
          for (const effect of transaction.effects) {
            if (effect.is(reloadStateEffect)) {
              // ATTENTION: The document state is out of sync with the document
              // authority, so we must reload it.
              this.reload().catch(err => console.error('Could not reload document state', err))
              return
            }
          }
        }
      },
      domEventsListeners: {
        mousedown (event, view) {
          const cmd = event.metaKey && process.platform === 'darwin'
          const ctrl = event.ctrlKey && process.platform !== 'darwin'
          if (!cmd && !ctrl) {
            return false
          }

          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos === null) {
            return false
          }

          const nodeAt = syntaxTree(view.state).resolve(pos, 0)

          // Both plain URLs as well as Zettelkasten links and tags are
          // implemented on the syntax tree.
          if (nodeAt.type.name === 'URL') {
            // We found a plain link!
            const url = view.state.sliceDoc(nodeAt.from, nodeAt.to)
            if (url.startsWith('[[') && url.endsWith(']]')) {
              editorInstance.emit('zettelkasten-link', url.substring(2, url.length - 2))
            } else {
              openMarkdownLink(url, view)
            }
            event.preventDefault()
            return true
          } else if ([ 'ZknLinkContent', 'ZknLinkTitle', 'ZknLinkPipe' ].includes(nodeAt.type.name)) {
            // We found a Zettelkasten link!
            event.preventDefault()
            // In these cases, nodeAt.parent is always a ZettelkastenLink
            const contentNode = nodeAt.parent?.getChild('ZknLinkContent')
            if (contentNode != null) {
              const linkContents = view.state.sliceDoc(contentNode.from, contentNode.to)
              editorInstance.emit('zettelkasten-link', linkContents)
            }
            return true
          } else if (nodeAt.type.name === 'ZknTagContent') {
            // A tag!
            const tagContents = view.state.sliceDoc(nodeAt.from, nodeAt.to)
            editorInstance.emit('zettelkasten-tag', tagContents)
            event.preventDefault()
            return true
          }

          // Lastly, the user may have clicked somewhere in a link. However,
          // since the link description can take various inline elements, we
          // have to recursively move up the tree until we find a 'Link' element
          // or abort if we reach the top
          let currentNode: SyntaxNode|null = nodeAt
          while (currentNode !== null && currentNode.name !== 'Link') {
            currentNode = currentNode.parent
          }

          if (currentNode !== null) {
            // We have a link
            const urlNode = currentNode.getChild('URL')
            if (urlNode !== null) {
              const url = view.state.sliceDoc(urlNode.from, urlNode.to)
              if (url.startsWith('[[') && url.endsWith(']]')) {
                editorInstance.emit('zettelkasten-link', url.substring(2, url.length - 2))
              } else {
                openMarkdownLink(url, view)
              }
              event.preventDefault()
              return true
            }
          }
        }
      }
    }

    switch (type) {
      case DocumentType.Markdown:
        return getMarkdownExtensions(options)
      case DocumentType.JSON:
        return getJSONExtensions(options)
      case DocumentType.YAML:
        return getYAMLExtensions(options)
      case DocumentType.LaTeX:
        return getTexExtensions(options)
    }
  }

  /**
   * Loads the document from main and sets up everything required to display and
   * edit it.
   */
  async loadDocument (persistentState?: EditorViewPersistentState): Promise<void> {
    const { content, type, startVersion } = await this.authority.fetchDoc(this.representedDocument)

    // The documents contents have changed, so we must recreate the state
    const extensions = this._getExtensions(this.representedDocument, type, startVersion)
    // This particular editor type needs access to the window and leaf IDs
    extensions.push(editorMetadataFacet.of({ windowId: this.windowId, leafId: this.leafId }))

    const state = EditorState.create({
      doc: Text.of(content.split('\n')),
      extensions
    })

    this._instance.setState(state)
    if (persistentState !== undefined) {
      // Now that the correct document has been loaded, there will be content
      // and we can restore the persisted information.
      const { scrollSnapshot, selection } = persistentState
      this._instance.dispatch({ selection, effects: scrollSnapshot })
    }
    // Ensure the theme switcher picks the state change up; this somehow doesn't
    // properly work after the document has been mounted to the DOM.
    this._instance.dispatch({ effects: configUpdateEffect.of(this.config) })

    // Provide the cached databases to the state (can be overridden by the
    // caller afterwards by calling setCompletionDatabase)
    this._instance.dispatch({ effects: tagsUpdate.of(this.databaseCache.tags) })
    this._instance.dispatch({ effects: citekeyUpdate.of(this.databaseCache.citations) })
    this._instance.dispatch({ effects: snippetsUpdate.of(this.databaseCache.snippets) })
    this._instance.dispatch({ effects: filesUpdate.of(this.databaseCache.files) })

    // Determine if this is a code doc and add the corresponding class to the
    // outer content DOM so that we can style it.
    if (type !== DocumentType.Markdown) {
      this._instance.contentDOM.classList.add('code')
    }

    this._instance.focus()
  }

  /**
   * Returns an object containing information needed to refresh the entire
   * editor instance after it being unmounted. Request this once before
   * unmounting this instance, and provide it back to a new instance when you
   * re-instantiate the same document again.
   *
   * @return  {EditorViewPersistentState}  The persistent state object.
   */
  public get persistentState (): EditorViewPersistentState {
    return {
      scrollSnapshot: this._instance.scrollSnapshot(),
      selection: this._instance.state.selection
    }
  }

  /**
   * This function allows to reload the full editor contents. This is useful if
   * a setting has changed that requires extensions to be fully reloaded.
   */
  async reload (): Promise<void> {
    await this.loadDocument()
  }

  /**
   * Unmount the editor instance entirely. NOTE: After calling this, DO NO
   * LONGER USE THIS CLASS INSTANCE! Instantiate it anew!
   */
  public unmount (): void {
    this.instance.destroy()
  }

  /**
   * Allows highlighting of arbitrary ranges independent of a search
   *
   * @param  {SelectionRange[]}  ranges  The ranges to highlight
   */
  highlightRanges (ranges: SelectionRange[]): void {
    this._instance.dispatch({ effects: highlightRangesEffect.of(ranges) })
  }

  /**
   * Pastes the clipboard contents as plain text, regardless of any formatted
   * text present.
   */
  pasteAsPlainText (): void {
    pasteAsPlain(this._instance)
  }

  /**
   * Copies the current editor contents into the clipboard as HTML
   */
  copyAsHTML (): void {
    copyAsHTML(this._instance)
  }

  /**
   * Small function that jumps to a specific line in the editor.
   *
   * @param  {number} line The line to pull into view
   */
  jtl (line: number): void {
    if (line > 0 && line <= this._instance.state.doc.lines) {
      const lineDesc = this._instance.state.doc.line(line)
      this._instance.dispatch({
        selection: { anchor: lineDesc.from, head: lineDesc.to },
        effects: EditorView.scrollIntoView(lineDesc.from, { y: 'center' })
      })
    }
    this._instance.focus()
  }

  /**
   * Moves the section that starts with an ATX heading on the from-line to the
   * line identified by to
   *
   * @param   {number}  from  The starting line (including the section heading)
   * @param   {number}  to    The target line for the section (is -1 if it should be moved to the end)
   */
  moveSection (from: number, to: number): void {
    const toc = this._instance.state.field(tocField)
    const entry = toc.find(e => e.line === from)

    if (entry === undefined) {
      return // Something went wrong
    }

    // The section ends at either the next higher or same-level heading
    const nextSections = toc.slice(toc.indexOf(entry) + 1)
    let endOfStartPos = this._instance.state.doc.length

    for (const section of nextSections) {
      if (section.level <= entry.level) {
        endOfStartPos = section.pos - 1
        break
      }
    }

    const toLine = to !== -1 ? to : this._instance.state.doc.lines
    const targetPos = this._instance.state.doc.line(toLine).to
    const entryContents = this._instance.state.sliceDoc(entry.pos, endOfStartPos)

    // Now, dispatch the updates.
    this._instance.dispatch({
      changes: [
        // First, "cut"
        { from: entry.pos, to: endOfStartPos, insert: '' },
        // Then, "paste"
        { from: targetPos, insert: entryContents }
      ]
    })
  }

  /**
   * Updates the provided options for all currently loaded documents.
   *
   * @param   {Object}  newOptions  The new options
   */
  setOptions (newOptions: EditorConfigOptions): void {
    // Here, we only trigger an update in the state itself. Then, we grab the
    // update via an effect to ensure we can cache the final, correct
    // configuration. However, in case there's no state (initial update), we
    // still need to cache the config here, as the updateListener won't be
    // firing yet.

    // Cache the current config first, and then apply it
    this.onConfigUpdate(newOptions)

    this.config = safeAssign(newOptions, this.config)

    this._instance.dispatch({ effects: configUpdateEffect.of(this.config) })
  }

  /**
   * This function is called by an updateListener that listens for changes to
   * the main configuration. We do so to ensure that the editor state is the
   * main source of truth, but that the editor class can cache the config in
   * case we need to exchange the states.
   *
   * @param   {Partial<EditorConfiguration>}  newOptions  The new options passed via the effect
   */
  private onConfigUpdate (newOptions: Partial<EditorConfiguration>): void {
    const inputModeChanged = newOptions.inputMode !== undefined && newOptions.inputMode !== this.config.inputMode
    const darkModeChanged = newOptions.darkMode !== undefined && newOptions.darkMode !== this.config.darkMode
    const themeChanged = newOptions.theme !== undefined && newOptions.theme !== this.config.theme

    // Third: The input mode, if applicable
    if (inputModeChanged) {
      if (newOptions.inputMode === 'emacs') {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure(emacs()) })
      } else if (newOptions.inputMode === 'vim') {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure(vimPlugin()) })
      } else {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure([]) })
      }
    }

    // Fourth: Switch theme, if applicable
    if (darkModeChanged || themeChanged) {
      const themes = getMainEditorThemes()

      this._instance.dispatch({
        effects: darkModeEffect.of({
          darkMode: newOptions.darkMode,
          ...themes[newOptions.theme ?? this.config.theme]
        })
      })
    }
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
    switch (cmd) {
      case 'markdownComment':
        applyComment(this._instance)
        break
      case 'markdownLink':
        insertLink(this._instance)
        break
      case 'markdownImage':
        insertImage(this._instance)
        break
      case 'insertFootnote':
        addNewFootnote(this._instance)
        break
      case 'markdownMakeTaskList':
        applyTaskList(this._instance)
        break
      default:
        console.warn('Unimplemented command:', cmd)
    }
  }

  /**
   * Replaces the main selection with arbitrary text
   *
   * @param   {string}  text  The text to replace the selection with
   */
  replaceSelection (text: string): void {
    const transaction = this._instance.state.replaceSelection(text)
    this._instance.dispatch(transaction)
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
   * Whether any element (including the editor, but also any widgets or other
   * elements inside the entire editor DOM element) has currently focus.
   *
   * @return  {boolean} The focus status
   */
  hasFocusWithin (): boolean {
    return this._instance.dom.contains(document.activeElement)
  }

  /* Sets the project info field of the editor state to the provided value.
   *
   * @param   {ProjectInfo|null}  info  The data
   */
  set projectInfo (info: ProjectInfo|null) {
    this._instance.dispatch({ effects: projectInfoUpdateEffect.of(info) })
  }

  /**
   * Sets an autocomplete database of given type to a new value
   *
   * @param   {String}  type      The type of the database
   * @param   {Object}  database  The show-hint-addon compatible database
   */
  setCompletionDatabase (type: 'tags', database: TagRecord[]): void
  setCompletionDatabase (type: 'citations', database: Array<{ citekey: string, displayText: string }>): void
  setCompletionDatabase (type: 'snippets', database: Array<{ name: string, content: string }>): void
  setCompletionDatabase (type: 'files', database: Array<{ filename: string, displayName: string, id: string }>): void
  setCompletionDatabase (type: string, database: any): void {
    switch (type) {
      case 'tags':
        this.databaseCache.tags = database
        this._instance.dispatch({ effects: tagsUpdate.of(database as TagRecord[]) })
        break
      case 'citations':
        this.databaseCache.citations = database
        this._instance.dispatch({ effects: citekeyUpdate.of(database as Array<{ citekey: string, displayText: string }>) })
        break
      case 'snippets':
        this.databaseCache.snippets = database
        this._instance.dispatch({ effects: snippetsUpdate.of(database as Array<{ name: string, content: string }>) })
        break
      case 'files':
        this.databaseCache.files = database
        this._instance.dispatch({ effects: filesUpdate.of(database as Array<{ filename: string, displayName: string, id: string }>) })
        break
    }
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
    const mainOffset = this._instance.state.selection.main.head
    const line = this._instance.state.doc.lineAt(mainOffset)
    const ast = markdownToAST(this._instance.state.sliceDoc(), syntaxTree(this._instance.state))
    const locale: string = window.config.get('appLang')
    return {
      words: this.wordCount ?? 0,
      chars: this.charCount ?? 0,
      cursor: { line: line.number, ch: mainOffset - line.from + 1 }, // Chars are still zero-based
      selections: this._instance.state.selection.ranges
      // Remove cursor-only positions
        .filter(sel => !sel.empty)
        // Then map to user readable ranges
        .map(sel => {
          // Analogous to how we determine the cursor position we do it here for
          // each selection present.
          const anchorLine = this._instance.state.doc.lineAt(sel.anchor)
          const headLine = this._instance.state.doc.lineAt(sel.head)
          const { words, chars } = countAll(ast, locale, sel.from, sel.to)
          return {
            anchor: { line: anchorLine.number, ch: sel.from - anchorLine.from + 1 },
            head: { line: headLine.number, ch: sel.to - headLine.from + 1 },
            words,
            chars
          }
        })
    }
  }

  /**
   * Whether the editor is currently in typewriter
   *
   * @return  {Boolean}  True if typewriter mode is active
   */
  get hasTypewriterMode (): boolean {
    return this.config.typewriterMode
  }

  /**
   * Activates or deactivates typewriter mode
   *
   * @param   {Boolean}  shouldBeTypewriter  True or False
   */
  set hasTypewriterMode (shouldBeTypewriter: boolean) {
    this.config.typewriterMode = shouldBeTypewriter
    this._instance.dispatch({
      effects: configUpdateEffect.of({ typewriterMode: shouldBeTypewriter })
    })
  }

  /**
   * Determines whether the editor is in distraction free mode
   *
   * @return  {boolean}  True or false
   */
  get distractionFree (): boolean {
    return this._instance.state.field(configField, false)?.distractionFree ?? false
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
    return this._instance.state.field(configField).readabilityMode
  }

  /**
   * Sets the readability mode
   *
   * @param   {boolean}  shouldBeReadability  Whether or not the mode should be active
   */
  set readabilityMode (shouldBeReadability: boolean) {
    this.config.readabilityMode = shouldBeReadability
    this._instance.dispatch({ effects: configUpdateEffect.of(this.config) })
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
    return this._instance.state.field(countField, false)?.words
  }

  /**
   * Returns the char count of the editor contents
   *
   * @return  {Number}  The number of characters
   */
  get charCount (): number|undefined {
    return this._instance.state.field(countField, false)?.chars
  }

  /**
   * Returns the underlying Codemirror instance
   *
   * @return  {EditorView}  The instance
   */
  get instance (): EditorView {
    return this._instance
  }

  /**
   * Retrieves the document represented by this editor instance.
   *
   * @return  {string}  the absolute path to the document.
   */
  get documentPath (): string {
    return this.representedDocument
  }
}
