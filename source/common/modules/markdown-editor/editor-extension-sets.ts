/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor extension sets
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains several sets of extensions that can be
 *                  added to Codemirror 6 instances. These are bundled into
 *                  logical units as we need to access them frequently and
 *                  Zettlr does not have the need for the granular control over
 *                  extensions that Codemirror 6 offers.
 *
 * END HEADER
 */

import { closeBrackets, closeBracketsKeymap, completionKeymap } from '@codemirror/autocomplete'
import { Update } from '@codemirror/collab'
import { defaultKeymap, historyKeymap, history } from '@codemirror/commands'
import { bracketMatching, codeFolding, foldGutter, indentOnInput, indentUnit, StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { yaml } from '@codemirror/legacy-modes/mode/yaml'
import { search, searchKeymap } from '@codemirror/search'
import { Compartment, EditorState, Extension, Prec } from '@codemirror/state'
import { keymap, drawSelection, EditorView, lineNumbers, ViewUpdate, DOMEventHandlers, dropCursor } from '@codemirror/view'
import { autocomplete } from './autocomplete'
import { customKeymap } from './commands/keymap'
import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from './theme/syntax'
import markdownParser from './parser/markdown-parser'
import { syntaxExtensions } from './parser/syntax-extensions'
import { defaultContextMenu } from './plugins/default-context-menu'
import { readabilityMode } from './plugins/readability'
import { hookDocumentAuthority } from './plugins/remote-doc'
import { lintGutter, linter } from '@codemirror/lint'
import { spellcheck } from './linters/spellcheck'
import { mdLint } from './linters/md-lint'
import { mdStatistics } from './plugins/statistics-fields'
import { tocField } from './plugins/toc-field'
import { typewriter } from './plugins/typewriter'
import { formattingToolbar, footnoteHover, filePreview, urlHover } from './tooltips'
import { EditorConfiguration, configField } from './util/configuration'
import { highlightRanges } from './plugins/highlight-ranges'
import { jsonFolding } from './code-folding/json'
import { markdownFolding } from './code-folding/markdown'
import { jsonLanguage, jsonParseLinter } from '@codemirror/lang-json'
import { softwrapVisualIndent } from './plugins/visual-indent'
import { codeblockBackground } from './plugins/codeblock-background'
import { vim } from '@replit/codemirror-vim'
import { emacs } from '@replit/codemirror-emacs'
import { distractionFree } from './plugins/distraction-free'
import { languageTool } from './linters/language-tool'
import { statusbar } from './plugins/statusbar'
import { themeManager } from './theme'
import { renderers } from './renderers'

/**
 * This interface describes the required properties which the extension sets
 * need to set up the proper extensions necessary for loading the specified
 * documents.
 */
export interface CoreExtensionOptions {
  initialConfig: EditorConfiguration
  remoteConfig: {
    filePath: string
    startVersion: number
    editorId: string
    pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>
    pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  }
  updateListener: (update: ViewUpdate) => void
  domEventsListeners: DOMEventHandlers<any>
  // Linter configuration
  lint: {
    // Should Markdown documents be linted?
    markdown: boolean
  }
  darkMode: boolean // Whether the editor should init with darkMode
}

/**
 * This compartment is being used to activate/disable the vim or emacs
 * keybindings dependent on the configuration.
 *
 * @var  {Compartment}
 */
export const inputModeCompartment = new Compartment()

/**
 * This private function loads a set of core extensions that are required for
 * all Codemirror instances inside of Zettlr regardless of document type. These
 * include:
 *
 * - Default keymaps
 * - An undo/redo history
 * - Code folding (only the service provider)
 * - A fold gutter
 * - A custom cursor drawing extension
 * - An extension enabling multiple extensions
 * - Search functionality
 * - Tab size and indentation with spaces or tabs
 * - line wrapping
 * - A configuration field (which has some options that only apply to Md or code)
 * - An update listener that is notified on every update
 * - The document authority functions to sync docs remotely
 *
 * @param   {CoreExtensionOptions}  options  The main extension options
 *
 * @return  {Extension[]}                    An array of core extensions
 */
function getCoreExtensions (options: CoreExtensionOptions): Extension[] {
  let inputMode: Extension = []
  if (options.initialConfig.inputMode === 'vim') {
    inputMode = vim()
  } else if (options.initialConfig.inputMode === 'emacs') {
    inputMode = emacs()
  }

  return [
    // Both vim and emacs modes need to be included first, before any other
    // keymap.
    inputModeCompartment.of(inputMode),
    // KEYMAPS
    keymap.of([
      ...defaultKeymap, // Minimal default keymap
      ...historyKeymap, // , // History commands (redo/undo)
      ...closeBracketsKeymap, // Binds Backspace to deletion of matching brackets
      ...searchKeymap // Search commands (Ctrl+F, etc.)
    ]),
    softwrapVisualIndent, // Always indent visually
    themeManager(options),
    // CODE FOLDING
    codeFolding(),
    foldGutter(),
    // HISTORY
    history(),
    // SELECTIONS
    // Overrides the default browser selection drawing, allows styling
    drawSelection({ drawRangeCursor: false, cursorBlinkRate: 1000 }),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    // Ensure the cursor never completely sticks to the top or bottom of the editor
    EditorView.scrollMargins.of(view => { return { top: 30, bottom: 30 } }),
    search({ top: true }), // Add a search
    // TAB SIZES/INDENTATION -> Depend on the configuration field
    EditorState.tabSize.from(configField, (val) => val.indentUnit),
    indentUnit.from(configField, (val) => val.indentWithTabs ? '\t' : ' '.repeat(val.indentUnit)),
    EditorView.lineWrapping, // Enable line wrapping,
    closeBrackets(),

    // Add the statusbar
    statusbar,

    // Add the configuration and preset it with whatever is in the cached
    // config.
    configField.init(state => JSON.parse(JSON.stringify(options.initialConfig))),

    // The updateListener is a custom extension we're using in order to be
    // able to emit events from this main class based on change events.
    EditorView.updateListener.of(options.updateListener),

    // Enables the editor to fetch updates to the document from main
    hookDocumentAuthority(
      options.remoteConfig.editorId,
      options.remoteConfig.filePath,
      options.remoteConfig.startVersion,
      options.remoteConfig.pullUpdates,
      options.remoteConfig.pushUpdates
    ),
    highlightRanges
  ]
}

/**
 * This private function returns a set of extensions required for all code
 * editors (but not the Markdown editors). These include:
 *
 * - The core extensions
 * - Line numbers
 * - Close-brackets support
 * - Bracket matching (highlighting)
 * - Indent on input (for proper indentation where applicable)
 * - The code syntax highlighter
 *
 * @param   {CoreExtensionOptions}  options  The main extension options
 *
 * @return  {Extension[]}                    An array of generic code extensions
 */
function getGenericCodeExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getCoreExtensions(options),
    lineNumbers(),
    bracketMatching(),
    indentOnInput(),
    codeSyntaxHighlighter()
  ]
}

/**
 * This public function returns a set of extensions required to run a default
 * Zettlr Markdown editor. These include:
 *
 * - The core extensions
 * - The autocompletion functionality
 * - A few extra keys (e.g. for copying as HTML)
 * - The Markdown parser and syntax highlighter
 * - Renderers for the partial WYSIWYG-highlights
 * - A set of extensions to the default syntax of the Codemirror plugin
 * - Document statistics that can be queried
 * - A typewriter mode
 * - A table of contents field
 * - Autocompletion support
 * - A readability mode
 * - The formatting toolbar
 * - Footnote previews on hover
 * - The paste handlers for image saving
 * - The default context menu with default Markdown formats
 * - A spellchecker
 *
 * @param   {CoreExtensionOptions}  options  The main config options
 *
 * @return  {Extension[]}                    An array of Markdown extensions
 */
export function getMarkdownExtensions (options: CoreExtensionOptions): Extension[] {
  const mdLinterExtensions = [spellcheck]

  let hasLinters = false

  if (options.lint.markdown) {
    hasLinters = true
    mdLinterExtensions.push(mdLint)
  }

  if (options.initialConfig.lintLanguageTool) {
    hasLinters = true // We always add this linter
  }

  if (hasLinters) {
    // If there's any linter (except the spellchecker), add a lint gutter
    mdLinterExtensions.push(
      lintGutter({
        markerFilter (diagnostics) {
          // Show any linter warnings and errors in the gutter *except* wrongly
          // spelled words, since that would be weird.
          return diagnostics.filter(d => d.source !== 'spellcheck' && d.source?.startsWith('language-tool') === false)
        }
      })
    )
  }

  return [
    ...getCoreExtensions(options),
    // We need our custom keymaps first
    keymap.of(completionKeymap),
    Prec.highest(keymap.of(customKeymap)),
    // The parser generates the AST for the document ...
    markdownParser(),
    // ... which can then be styled with a highlighter
    markdownSyntaxHighlighter(),
    syntaxExtensions, // Add our own specific syntax plugin
    renderers(options.initialConfig),
    mdLinterExtensions,
    languageTool,
    // Some statistics we need for Markdown documents
    mdStatistics,
    typewriter,
    distractionFree,
    tocField,
    markdownFolding,
    autocomplete,
    readabilityMode,
    formattingToolbar,
    footnoteHover,
    urlHover,
    filePreview,
    codeblockBackground, // Add a background behind codeblocks
    defaultContextMenu, // A default context menu
    EditorView.domEventHandlers(options.domEventsListeners)
  ]
}

/**
 * This public function returns a set of extensions required to display JSON
 * documents in Zettlr editors. These include the core extensions, the generic
 * code extensions as well as the JSON syntax highlighter.
 *
 * @param   {CoreExtensionOptions}  options  The default options
 *
 * @return  {Extension[]}                    An array of options for JSON files
 */
export function getJSONExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    jsonFolding,
    jsonLanguage,
    linter(jsonParseLinter())
  ]
}

/**
 * This public function returns a set of extensions required to display YAML
 * documents in Zettlr editors. These include the core extensions, the generic
 * code extensions as well as the YAML syntax highlighter.
 *
 * @param   {CoreExtensionOptions}  options  The default options
 *
 * @return  {Extension[]}                    An array of options for YAML files
 */
export function getYAMLExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    StreamLanguage.define(yaml)
  ]
}

/**
 * This public function returns a set of extensions required to display LaTeX
 * documents in Zettlr editors. These include the core extensions, the generic
 * code extensions as well as the LaTeX syntax highlighter.
 *
 * @param   {CoreExtensionOptions}  options  The default options
 *
 * @return  {Extension[]}                    An array of options for LaTeX files
 */
export function getTexExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    StreamLanguage.define(stex)
  ]
}
