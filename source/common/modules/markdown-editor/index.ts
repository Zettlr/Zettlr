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
  EditorSelection,
  EditorState,
  Extension,
  SelectionRange
} from '@codemirror/state'
import { Update } from '@codemirror/collab'
import { syntaxTree } from '@codemirror/language'

// Keymaps/Input modes
import { vim } from '@replit/codemirror-vim'
import { emacs } from '@replit/codemirror-emacs'

import {
  charCountField,
  charCountNoSpacesField,
  wordCountField
} from './plugins/statistics-fields'

import { ToCEntry, tocField } from './plugins/toc-field'
import {
  citekeyUpdate,
  filesUpdate,
  tagsUpdate,
  snippetsUpdate
} from './autocomplete'

// Main configuration
import {
  CoreExtensionOptions,
  getJSONExtensions,
  getMarkdownExtensions,
  getTexExtensions,
  getYAMLExtensions,
  inputModeCompartment
} from './editor-extension-sets'

import {
  configField,
  configUpdateEffect,
  EditorConfigOptions,
  EditorConfiguration,
  getDefaultConfig
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
import { darkModeSwitch } from './theme'

import safeAssign from '@common/util/safe-assign'
import countWords from '@common/util/count-words'
import { DocumentType, DP_EVENTS } from '@dts/common/documents'
import { TagRecord } from '@providers/tags'

const path = window.path
const ipcRenderer = window.ipc

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
  selections: Array<{
    anchor: UserReadablePosition
    head: UserReadablePosition
    words: number
    chars: number
  }>
}

export default class MarkdownEditor extends EventEmitter {
  private readonly _instance: EditorView
  private readonly editorId: string
  private readonly fetchDoc: (filePath: string) => Promise<{ content: string, type: DocumentType, startVersion: number }>
  private readonly pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>
  private readonly pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  private config: EditorConfiguration
  private _darkMode: boolean

  private readonly databaseCache: {
    tags: TagRecord[]
    citations: Array<{ citekey: string, displayText: string }>
    snippets: Array<{ name: string, content: string }>
    files: Array<{ filename: string, displayName: string, id: string }>
  }

  /**
   * Holds all documents that are still open as a cache so the sometimes quite
   * large initial configuration doesn't always have to be re-added
   *
   * @var {Map<string, EditorState>}
   */
  private readonly stateCache: Map<string, EditorState>

  // "What is this?", you may ask. This is a cache to remember anything important
  // that has to be set for a document that is open but that is not saved inside
  // the state in the main process. The scroll position is obvious (has nothing
  // to do with the state), but the selection will also not be stored in the main
  // process. This might look cool because you could literally remote-control
  // other editor panes, but we don't really need this.
  // Still TODO: Need to map the selection everytime through updates!
  private readonly documentViewCache: Map<string, {
    scrollPosition: number
    selection: any
  }>

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
    editorId: string,
    getDocument: (path: string) => Promise<{ content: string, type: DocumentType, startVersion: number }>,
    pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>,
    pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  ) {
    super() // Set up the event emitter

    this.fetchDoc = getDocument
    this.pullUpdates = pullUpdates
    this.pushUpdates = pushUpdates

    this.editorId = editorId
    this._darkMode = false
    // Since the editor state needs to be rebuilt whenever the document changes,
    // we have to persist the databases (and feed them to the state) everytime
    // we have to rebuild it (during swapDoc).
    this.databaseCache = { tags: [], citations: [], snippets: [], files: [] }
    this.stateCache = new Map()

    // This remembers the last seen scroll positions per document and restores them
    // if possible.
    this.documentViewCache = new Map()

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

    // Keep the scroll position for the current document always updated.
    this._instance.scrollDOM.addEventListener('scroll', (event) => {
      const documentPath = this._instance.state.field(configField, false)?.metadata.path
      if (documentPath !== undefined) {
        const cache = this.documentViewCache.get(documentPath)
        if (cache !== undefined) {
          const pos = this._instance.scrollDOM.scrollTop
          cache.scrollPosition = pos
          this.documentViewCache.set(documentPath, cache)
        }
      }
    }, true)

    // Listen to file close events so that we can keep the document cache clean
    ipcRenderer.on('documents-update', (e, payload: { event: DP_EVENTS, context?: any }) => {
      const { event, context } = payload
      if (
        event === DP_EVENTS.CLOSE_FILE &&
        context !== undefined &&
        context.filePath !== undefined &&
        this.stateCache.has(context.filePath)
      ) {
        this.stateCache.delete(context.filePath)
      }
    })
  } // END CONSTRUCTOR

  private _getExtensions (filePath: string, type: DocumentType, startVersion: number): Extension[] {
    // eslint-disable-next-line @typescript-eslint/no-this-alias
    const editorInstance = this

    const mdLint = window.config.get('editor.lint.markdown') as boolean

    const options: CoreExtensionOptions = {
      initialConfig: JSON.parse(JSON.stringify(this.config)),
      darkMode: this._darkMode,
      remoteConfig: {
        filePath,
        startVersion,
        editorId: this.editorId,
        pullUpdates: this.pullUpdates,
        pushUpdates: this.pushUpdates
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
            if (effect.is(configUpdateEffect)) {
              this.onConfigUpdate(effect.value)
            }
          }
        }

        // Update the selection in our cache
        const cache = this.documentViewCache.get(filePath)
        if (cache !== undefined) {
          this.documentViewCache.set(filePath, {
            scrollPosition: cache.scrollPosition,
            selection: update.state.selection.toJSON()
          })
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

          // Now let's see if the user clicked on something useful. We have to
          // check tags the hard way as they are not implemented as syntax nodes.
          const lineInfo = view.lineBlockAt(pos)
          const relativePos = pos - lineInfo.from
          const lineText = view.state.sliceDoc(lineInfo.from, lineInfo.to)
          for (const match of lineText.matchAll(/(?<=^|\s|[({[])#(#?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?)/g)) {
            const idx = match.index as number
            if (idx > pos) {
              break // We're too far
            } else if (idx <= relativePos && idx + match[0].length >= relativePos) {
              // Got a tag
              editorInstance.emit('zettelkasten-tag', match[0])
              event.preventDefault()
              return true
            }
          }

          // Both plain URLs as well as Zettelkasten links are implemented on
          // the syntax tree.
          if (nodeAt.type.name === 'URL') {
            // We found a link!
            const url = view.state.sliceDoc(nodeAt.from, nodeAt.to)
            openMarkdownLink(url, view)
            event.preventDefault()
            return true
          } else if (nodeAt.type.name === 'ZknLinkContent') {
            // We found a Zettelkasten link!
            const linkContents = view.state.sliceDoc(nodeAt.from, nodeAt.to)
            editorInstance.emit('zettelkasten-link', linkContents)
            event.preventDefault()
            return true
          }
        },
        drop (event, view) {
          const dataTransfer = event.dataTransfer

          if (dataTransfer === null) {
            return false
          }

          const zettlrFile = dataTransfer.getData('text/x-zettlr-file')
          const docTab = dataTransfer.getData('zettlr/document-tab')

          if (docTab !== '') {
            return false // There's a document being dragged, let the MainEditor capture the event
          }

          const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
          if (pos === null) {
            return false
          }

          event.preventDefault()
          event.stopPropagation()

          const cwd = path.dirname(view.state.field(configField).metadata.path)

          // First: Do we have a fileList of files to drop here?
          if (dataTransfer.files.length > 0) {
            const files: string[] = []
            // We have a list of files being dropped onto the editor --> link them
            for (let i = 0; i < dataTransfer.files.length; i++) {
              const file = dataTransfer.files.item(i)
              if (file !== null) {
                files.push(file.path)
              }
            }

            const toInsert = files.map(f => {
              let pathToInsert = path.posix.relative(cwd, f)
              if (!pathToInsert.startsWith('./') && !pathToInsert.startsWith('../')) {
                pathToInsert = './' + pathToInsert
              }

              if (/\.(?:png|jpe?g|gif|bmp|svg|tiff?)$/i.test(f)) {
                return `![${path.basename(f)}](${pathToInsert})`
              } else {
                return `[${path.basename(f)}](${pathToInsert})`
              }
            })

            view.dispatch({ changes: { from: pos, insert: toInsert.join('\n') } })
          } else if (zettlrFile !== '') {
            // We have a Markdown/Code file to insert
            const data = JSON.parse(zettlrFile) as { type: 'code'|'file'|'directory'|'other', path: string, id?: string }
            const name = path.basename(data.path, path.extname(data.path))
            let pathToInsert = path.posix.relative(cwd, data.path)
            if (!pathToInsert.startsWith('./') && !pathToInsert.startsWith('../')) {
              pathToInsert = './' + pathToInsert
            }

            if (data.type === 'file') {
              // Insert as Zkn link
              view.dispatch({ changes: { from: pos, insert: `[[${name}]]` } })
            } else if (data.type === 'code') {
              // Insert as Md link
              view.dispatch({ changes: { from: pos, insert: `[${name}](${pathToInsert})` } })
            } else if (data.type === 'other') {
              const isImage = /\.(?:png|jpe?g|gif|bmp|svg|tiff?)$/i.test(data.path)
              if (isImage) {
                view.dispatch({ changes: { from: pos, insert: `![${name}](${pathToInsert})` } })
              } else {
                view.dispatch({ changes: { from: pos, insert: `[${name}](${pathToInsert})` } })
              }
            }
          }
          return false
        }
      },
      lint: {
        markdown: mdLint
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
   * Swaps the current CodeMirror Document with a new one.
   *
   * @param  {string}   documentPath  The document to switch to
   * @param  {boolean}  force         Optional. If not given or not true, prevents
   *                                  reloading the same document again.
   */
  async swapDoc (documentPath: string, force: boolean = false): Promise<void> {
    // Do not reload the document unless explicitly specified. The reason is
    // that sometimes we do need to programmatically reload the document, but in
    // 99% of the cases, this only leads to unnecessary flickering.
    if (this.config.metadata.path === documentPath && !force) {
      return
    }

    // Before exchanging anything, cache the current state
    this.stateCache.set(this.config.metadata.path, this._instance.state)

    // Get the scroll position cache before so it is not overridden by the
    // initial state update
    const cache = this.documentViewCache.get(documentPath)

    const { content, type, startVersion } = await this.fetchDoc(documentPath)

    // Now set the correct state, either from cache or create anew
    const stateToBeRestored = this.stateCache.get(documentPath)
    if (stateToBeRestored !== undefined) {
      this._instance.setState(stateToBeRestored)
    } else {
      // We need to set the file's path already here so that it's available on
      // the initial rendering round for any extensions that need it
      this.config.metadata.path = documentPath

      const state = EditorState.create({
        doc: content,
        extensions: this._getExtensions(documentPath, type, startVersion)
      })

      this._instance.setState(state)
    }

    // Provide the cached databases to the state (can be overridden by the
    // caller afterwards by calling setCompletionDatabase)
    this._instance.dispatch({ effects: tagsUpdate.of(this.databaseCache.tags) })
    this._instance.dispatch({ effects: citekeyUpdate.of(this.databaseCache.citations) })
    this._instance.dispatch({ effects: snippetsUpdate.of(this.databaseCache.snippets) })
    this._instance.dispatch({ effects: filesUpdate.of(this.databaseCache.files) })

    // Determine if this is a code doc and add the corresponding class to the
    // outer content DOM so that we can style it.
    if (type === DocumentType.Markdown) {
      this._instance.contentDOM.classList.remove('code')
    } else {
      this._instance.contentDOM.classList.add('code')
    }

    this._instance.focus()

    // Restore the old cached positions if applicable
    if (cache !== undefined) {
      this._instance.scrollDOM.scrollTop = cache.scrollPosition
      this._instance.dispatch({ selection: EditorSelection.fromJSON(cache.selection) })
    } else {
      this._instance.scrollDOM.scrollTop = 0 // Scroll to top
      // Selection will already be default
      this.documentViewCache.set(documentPath, {
        scrollPosition: 0,
        selection: this._instance.state.selection.toJSON()
      })
    }
  }

  /**
   * This function allows to reload the full editor contents. This is useful if
   * a setting has changed that requires extensions to be fully reloaded.
   */
  async reload (): Promise<void> {
    await this.swapDoc(this.config.metadata.path, true)
  }

  /**
   * Empties out the editor and replaces it with an empty state.
   */
  public emptyEditor (): void {
    this._instance.setState(EditorState.create())
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

    // Cache the current config first, and then apply it
    this.config = safeAssign(newOptions, this.config)

    // Third: The input mode, if applicable
    if (inputModeChanged) {
      if (this.config.inputMode === 'emacs') {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure(emacs()) })
      } else if (this.config.inputMode === 'vim') {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure(vim()) })
      } else {
        this._instance.dispatch({ effects: inputModeCompartment.reconfigure([]) })
      }
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
    const mainSel = this._instance.state.selection.main
    this._instance.dispatch({
      changes: { from: mainSel.from, to: mainSel.to, insert: text }
    })
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
  setCompletionDatabase (type: 'tags', database: TagRecord[]): void
  setCompletionDatabase (type: 'citations', database: Array<{ citekey: string, displayText: string }>): void
  setCompletionDatabase (type: 'snippets', database: Array<{ name: string, content: string }>): void
  setCompletionDatabase (type: 'files', database: Array<{ filename: string, id: string }>): void
  setCompletionDatabase (type: string, database: any): void {
    switch (type) {
      case 'tags':
        this.databaseCache.tags = database
        this._instance.dispatch({ effects: tagsUpdate.of(database) })
        break
      case 'citations':
        this.databaseCache.citations = database
        this._instance.dispatch({ effects: citekeyUpdate.of(database) })
        break
      case 'snippets':
        this.databaseCache.snippets = database
        this._instance.dispatch({ effects: snippetsUpdate.of(database) })
        break
      case 'files':
        this.databaseCache.files = database
        this._instance.dispatch({ effects: filesUpdate.of(database) })
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
    const mainOffset = this._instance.state.selection.main.from
    const line = this._instance.state.doc.lineAt(mainOffset)
    return {
      words: this.wordCount ?? 0,
      chars: this.charCount ?? 0,
      chars_wo_spaces: this.charCountWithoutSpaces ?? 0,
      cursor: { line: line.number, ch: mainOffset - line.from + 1 }, // Chars are still zero-based
      selections: this._instance.state.selection.ranges
      // Remove cursor-only positions
        .filter(sel => !sel.empty)
        // Then map to user readable ranges
        .map(sel => {
          // Analogous to how we determine the cursor position we do it here for
          // each selection present.
          const anchorLine = this._instance.state.doc.lineAt(sel.from)
          const headLine = this._instance.state.doc.lineAt(sel.to)
          const selContent = this._instance.state.sliceDoc(sel.from, sel.to)
          return {
            anchor: { line: anchorLine.number, ch: sel.from - anchorLine.from + 1 },
            head: { line: headLine.number, ch: sel.to - headLine.from + 1 },
            words: countWords(selContent, false),
            chars: countWords(selContent, true)
          }
        })
    }
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

  get darkMode (): boolean {
    return this._darkMode
  }

  set darkMode (newValue: boolean) {
    this._darkMode = newValue
    this._instance.dispatch({ effects: darkModeSwitch.of(newValue) })
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

  /**
   * Returns the underlying Codemirror instance
   *
   * @return  {EditorView}  The instance
   */
  get instance (): EditorView {
    return this._instance
  }
}
