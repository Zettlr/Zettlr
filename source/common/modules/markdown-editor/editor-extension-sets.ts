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

import { closeBrackets } from '@codemirror/autocomplete'
import { type Update } from '@codemirror/collab'
import { history } from '@codemirror/commands'
import { bracketMatching, codeFolding, foldGutter, indentOnInput, indentUnit, StreamLanguage } from '@codemirror/language'
import { stex } from '@codemirror/legacy-modes/mode/stex'
import { yaml } from '@codemirror/lang-yaml'
import { search } from '@codemirror/search'
import { Compartment, EditorState, type Extension } from '@codemirror/state'
import {
  drawSelection,
  EditorView,
  lineNumbers,
  dropCursor,
  type ViewUpdate,
  type DOMEventHandlers
} from '@codemirror/view'

import { autocomplete } from './autocomplete'
import { codeSyntaxHighlighter, markdownSyntaxHighlighter } from './theme/syntax'
import markdownParser from './parser/markdown-parser'
import { syntaxExtensions } from './parser/syntax-extensions'
import { defaultContextMenu } from './plugins/default-context-menu'
import { readabilityMode } from './plugins/readability'
import { hookDocumentAuthority } from './plugins/remote-doc'
import { lintGutter, linter } from '@codemirror/lint'
import { spellcheck } from './linters/spellcheck'
import { mdLint } from './linters/md-lint'
import { countField } from './plugins/statistics-fields'
import { tocField } from './plugins/toc-field'
import { typewriter } from './plugins/typewriter'
import { formattingToolbar, footnoteHover, filePreview, urlHover } from './tooltips'
import { type EditorConfiguration, configField } from './util/configuration'
import { highlightRanges } from './plugins/highlight-ranges'
import { jsonFolding } from './code-folding/json'
import { markdownFolding } from './code-folding/markdown'
import { json, jsonParseLinter } from '@codemirror/lang-json'
import { softwrapVisualIndent } from './plugins/visual-indent'
import { backgroundLayers } from './plugins/code-background'
import { emacs } from '@replit/codemirror-emacs'
import { distractionFree } from './plugins/distraction-free'
import { languageTool } from './linters/language-tool'
import { statusbar } from './statusbar'
import { renderers } from './renderers'
import { mdPasteDropHandlers } from './plugins/md-paste-drop-handlers'
import { footnoteGutter } from './plugins/footnote-gutter'
import { yamlFrontmatterLint } from './linters/yaml-frontmatter-lint'
import { darkMode } from './theme/dark-mode'
import { themeBerlinLight, themeBerlinDark } from './theme/berlin'
import { themeBielefeldLight, themeBielefeldDark } from './theme/bielefeld'
import { themeBordeauxLight, themeBordeauxDark } from './theme/bordeaux'
import { themeFrankfurtLight, themeFrankfurtDark } from './theme/frankfurt'
import { themeKarlMarxStadtLight, themeKarlMarxStadtDark } from './theme/karl-marx-stadt'
import { mainOverride } from './theme/main-override'
import { highlightWhitespace } from './plugins/highlight-whitespace'
import { tagClasses } from './plugins/tag-classes'
import { autocompleteTriggerCharacter } from './autocomplete/snippets'
import { defaultKeymap } from './keymaps/default'
import { vimPlugin } from './plugins/vim-mode'
import { projectInfoField } from './plugins/project-info-field'

export interface CoreExtensionOptions {
  initialConfig: EditorConfiguration
  remoteConfig: {
    filePath: string
    startVersion: number
    pullUpdates: (filePath: string, version: number) => Promise<Update[]|false>
    pushUpdates: (filePath: string, version: number, updates: Update[]) => Promise<boolean>
  }
  updateListener: (update: ViewUpdate) => void
  domEventsListeners: DOMEventHandlers<any>
}

export const inputModeCompartment = new Compartment()

export function getMainEditorThemes (): Record<EditorConfiguration['theme'], { lightThemes: Extension[], darkThemes: Extension[] }> {
  return {
    berlin: {
      lightThemes: [ mainOverride, themeBerlinLight ],
      darkThemes: [ mainOverride, themeBerlinDark ]
    },
    bielefeld: {
      lightThemes: [ mainOverride, themeBielefeldLight ],
      darkThemes: [ mainOverride, themeBielefeldDark ]
    },
    bordeaux: {
      lightThemes: [ mainOverride, themeBordeauxLight ],
      darkThemes: [ mainOverride, themeBordeauxDark ]
    },
    frankfurt: {
      lightThemes: [ mainOverride, themeFrankfurtLight ],
      darkThemes: [ mainOverride, themeFrankfurtDark ]
    },
    'karl-marx-stadt': {
      lightThemes: [ mainOverride, themeKarlMarxStadtLight ],
      darkThemes: [ mainOverride, themeKarlMarxStadtDark ]
    }
  }
}

function getCoreExtensions (options: CoreExtensionOptions): Extension[] {
  const inputMode: Extension[] = []
  if (options.initialConfig.inputMode === 'vim') {
    inputMode.push(vimPlugin())
  } else if (options.initialConfig.inputMode === 'emacs') {
    inputMode.push(emacs())
  }

  const autoCloseBracketsConfig: Extension[] = []
  if (options.initialConfig.autoCloseBrackets) {
    autoCloseBracketsConfig.push(closeBrackets())
  }

  const themes = getMainEditorThemes()

  let scrollTimer: number | undefined

  return [
    inputModeCompartment.of(inputMode),
    defaultKeymap(),
    darkMode({ darkMode: options.initialConfig.darkMode, ...themes[options.initialConfig.theme] }),
    codeFolding(),
    foldGutter(),
    history(),
    drawSelection({ drawRangeCursor: false, cursorBlinkRate: 1000 }),
    highlightWhitespace(options.initialConfig.highlightWhitespace),
    dropCursor(),
    EditorState.allowMultipleSelections.of(true),
    EditorView.scrollMargins.of(_view => { return { top: 30, bottom: 30 } }),
    search({ top: true }),
    EditorState.tabSize.from(configField, (val) => val.indentUnit),
    indentUnit.from(configField, (val) => val.indentWithTabs ? '\t' : ' '.repeat(val.indentUnit)),
    EditorView.lineWrapping,
    autoCloseBracketsConfig,
    autocompleteTriggerCharacter.of(':'),
    statusbar,
    configField.init(_state => JSON.parse(JSON.stringify(options.initialConfig))),

    EditorView.updateListener.of((update: ViewUpdate) => {
      if (update.transactions.some(tr => tr.isUserEvent('input'))) {
        if (scrollTimer !== undefined) {
          clearTimeout(scrollTimer)
        }
        scrollTimer = window.setTimeout(() => {
          const sel = update.view.state.selection.main
          const rect = update.view.coordsAtPos(sel.head)
          if (rect && (rect.top < 0 || rect.bottom > window.innerHeight)) {
            update.view.scrollDOM.scrollTop += rect.top - 100
          }
        }, 50)
      }
    }),

    hookDocumentAuthority(
      options.remoteConfig.filePath,
      options.remoteConfig.startVersion,
      options.remoteConfig.pullUpdates,
      options.remoteConfig.pushUpdates
    ),
    highlightRanges
  ]
}

function getGenericCodeExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getCoreExtensions(options),
    lineNumbers(),
    bracketMatching(),
    indentOnInput(),
    codeSyntaxHighlighter()
  ]
}

export function getMarkdownExtensions (options: CoreExtensionOptions): Extension[] {
  const mdLinterExtensions = [
    spellcheck,
    yamlFrontmatterLint
  ]

  let hasLinters = false

  if (options.initialConfig.lintMarkdown) {
    hasLinters = true
    mdLinterExtensions.push(mdLint)
  }

  if (options.initialConfig.lintLanguageTool) {
    hasLinters = true
  }

  if (hasLinters) {
    mdLinterExtensions.push(
      lintGutter({
        markerFilter (diagnostics) {
          return diagnostics.filter(d => d.source !== 'spellcheck' && d.source?.startsWith('language-tool') === false)
        }
      })
    )
  }

  return [
    ...getCoreExtensions(options),
    EditorView.domEventHandlers(mdPasteDropHandlers),
    markdownParser({
      zknLinkParserConfig: { format: options.initialConfig.zknLinkFormat }
    }),
    markdownSyntaxHighlighter(),
    syntaxExtensions,
    renderers(options.initialConfig),
    mdLinterExtensions,
    languageTool,
    countField,
    typewriter,
    distractionFree,
    tocField,
    projectInfoField,
    markdownFolding,
    autocomplete,
    readabilityMode,
    formattingToolbar,
    footnoteHover,
    footnoteGutter,
    urlHover,
    filePreview,
    backgroundLayers,
    defaultContextMenu,
    softwrapVisualIndent,
    tagClasses(),
    EditorView.domEventHandlers(options.domEventsListeners)
  ]
}

export function getJSONExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    jsonFolding,
    json(),
    linter(jsonParseLinter())
  ]
}

export function getYAMLExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    yaml()
  ]
}

export function getTexExtensions (options: CoreExtensionOptions): Extension[] {
  return [
    ...getGenericCodeExtensions(options),
    StreamLanguage.define(stex)
  ]
}
