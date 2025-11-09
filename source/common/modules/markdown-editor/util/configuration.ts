/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor Configuration
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Since configuration for CodeMirror mainly works via
 *                  StateFields and StateEffects, in order to reduce the amount
 *                  of boiler plate, we define all configuration options as an
 *                  easily query-able object similarly to CM5 -- only now with
 *                  full type support.
 *
 * END HEADER
 */

import { StateEffect, StateField } from '@codemirror/state'
import safeAssign from '@common/util/safe-assign'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { type MarkdownTheme } from '@providers/config/get-config-template'

export interface AutocorrectOptions {
  active: boolean
  matchWholeWords: boolean
  magicQuotes: { primary: string, secondary: string }
  replacements: Array<{ key: string, value: string }>
}

/**
 * Represents a single custom key mapping for Vim Normal mode
 */
export interface KeyMapping {
  /** The Vim command character this mapping produces (e.g., '{', '}', '[', ']') */
  vimChar: string
  /** The physical key code (e.g., 'Digit8', 'BracketLeft') */
  code: string
  /** Whether Shift key is required */
  shiftKey: boolean
  /** Whether Alt/Option key is required */
  altKey: boolean
  /** Whether Ctrl key is required */
  ctrlKey: boolean
  /** Whether Meta/Cmd key is required */
  metaKey: boolean
}

export interface EditorConfiguration {
  autocompleteSuggestEmojis: boolean
  autocorrect: AutocorrectOptions
  autoCloseBrackets: boolean
  renderCitations: boolean
  renderIframes: boolean
  renderImages: boolean
  renderLinks: boolean
  renderMath: boolean
  renderTasks: boolean
  renderHeadings: boolean
  renderTables: boolean
  renderEmphasis: boolean
  imagePreviewWidth: number
  imagePreviewHeight: number
  idRE: string
  idGen: string
  indentUnit: number
  indentWithTabs: boolean
  linkPreference: 'always'|'never'|'withID'
  zknLinkFormat: 'link|title'|'title|link'
  linkFilenameOnly: boolean
  metadata: {
    path: string
    id: string
    library: string
  }
  boldFormatting: '**'|'__'
  italicFormatting: '*'|'_'
  citeStyle: 'in-text'|'in-text-suffix'|'regular'
  inputMode: 'default'|'vim'|'emacs'
  vimFixedKeyboardLayout: boolean
  vimKeyMappings: Record<string, KeyMapping>
  muteLines: boolean
  readabilityAlgorithm: 'dale-chall'|'gunning-fog'|'coleman-liau'|'automated-readability'
  readabilityMode: boolean
  typewriterMode: boolean
  distractionFree: boolean
  lintMarkdown: boolean
  lintLanguageTool: boolean
  showStatusbar: boolean
  showFormattingToolbar: boolean
  darkMode: boolean
  theme: MarkdownTheme
  margins: 'S'|'M'|'L'
  highlightWhitespace: boolean
  countChars: boolean
}

export function getDefaultConfig (): EditorConfiguration {
  return {
    autocorrect: {
      active: true,
      matchWholeWords: false,
      magicQuotes: {
        primary: '"…"',
        secondary: "'…'"
      },
      replacements: []
    },
    autocompleteSuggestEmojis: false,
    autoCloseBrackets: true,
    renderCitations: true,
    renderIframes: true,
    renderImages: true,
    renderLinks: true,
    renderMath: true,
    renderTasks: true,
    renderHeadings: true,
    renderTables: true,
    renderEmphasis: true,
    imagePreviewWidth: 100,
    imagePreviewHeight: 100,
    idRE: '(\\d{14})',
    idGen: '',
    indentUnit: 4,
    indentWithTabs: false,
    linkPreference: 'always',
    zknLinkFormat: 'link|title',
    linkFilenameOnly: false,
    metadata: {
      path: '',
      id: '',
      library: CITEPROC_MAIN_DB
    },
    boldFormatting: '**',
    italicFormatting: '_',
    citeStyle: 'regular',
    muteLines: true,
    readabilityAlgorithm: 'dale-chall',
    inputMode: 'default',
    vimFixedKeyboardLayout: false,
    vimKeyMappings: getDefaultVimKeyMappings(),
    readabilityMode: false,
    typewriterMode: false,
    distractionFree: false,
    lintMarkdown: false,
    lintLanguageTool: false,
    showStatusbar: false,
    showFormattingToolbar: true,
    darkMode: false,
    theme: 'berlin',
    margins: 'M',
    highlightWhitespace: false,
    countChars: false
  }
}

/**
 * Returns default Vim key mappings pre-populated with common modifier-required characters.
 * These are initially empty (unmapped), and users can train them via the UI.
 */
export function getDefaultVimKeyMappings (): Record<string, KeyMapping> {
  // Pre-populate with common Vim characters that typically require modifiers on non-QWERTY layouts
  const vimChars = ['{', '}', '[', ']', '(', ')', '@', '#', '$', '%', '^', '&', '*']

  const mappings: Record<string, KeyMapping> = {}

  for (const vimChar of vimChars) {
    // Initialize with empty mapping (unmapped state)
    mappings[vimChar] = {
      vimChar,
      code: '', // Empty = not yet mapped
      shiftKey: false,
      altKey: false,
      ctrlKey: false,
      metaKey: false
    }
  }

  return mappings
}

export type EditorConfigOptions = Partial<EditorConfiguration>

export const configUpdateEffect = StateEffect.define<EditorConfigOptions>()
export const configField = StateField.define<EditorConfiguration>({
  create (_state) {
    return getDefaultConfig()
  },
  update (val, transaction) {
    for (const effect of transaction.effects) {
      if (effect.is(configUpdateEffect)) {
        const newConfig = safeAssign(effect.value, val)
        // Perform some housekeeping
        // Make sure the replacements are sorted longest-key-first
        newConfig.autocorrect.replacements.sort((a, b) => b.key.length - a.key.length)
        return newConfig
      }
    }
    return val
  }
})
