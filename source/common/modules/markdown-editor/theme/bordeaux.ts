/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Bordeaux Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Bordeaux theme styles
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { defaultVarsDark, defaultVarsLight, type ThemeVars } from './main-override'

const primaryColor = '#1bd4e9'
const secondaryColor = '#d02325'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = '#839496'

const scrollerBackground = '#fffff8'
const scrollerBackgroundDark = '#002b36'

const selectionLight = '#b8f0f6cc'
const selectionDark = '#0c616acc'

const highlightDark = 'black'

const font = 'Inconsolata, monospace'
const codeFont = 'Inconsolata, monospace'

const citationBackgroundDark = '#002024'

const codeBackgroundDark = '#002024'

const errorColor = '#d02325'

const linkDecoration = 'underline'

export const bordeauxVarsLight: ThemeVars = {
  ...defaultVarsLight,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': secondaryColor,
  '--zettlr-editor-scroller-color': scrollerColor,
  '--zettlr-editor-scroller-bg': scrollerBackground,
  '--zettlr-editor-selection-color': selectionLight,
  '--zettlr-editor-font': font,
  '--zettlr-editor-code-font': codeFont,
  '--zettlr-editor-error-color': errorColor,
  '--zettlr-editor-link-decoration': linkDecoration,
}

export const bordeauxVarsDark: ThemeVars = {
  ...defaultVarsDark,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': secondaryColor,
  '--zettlr-editor-scroller-color': scrollerColorDark,
  '--zettlr-editor-scroller-bg': scrollerBackgroundDark,
  '--zettlr-editor-selection-color': selectionDark,
  '--zettlr-editor-highlight-color': highlightDark,
  '--zettlr-editor-font': font,
  '--zettlr-editor-code-font': codeFont,
  '--zettlr-editor-citation-bg': citationBackgroundDark,
  '--zettlr-editor-code-bg': codeBackgroundDark,
  '--zettlr-editor-error-color': errorColor,
  '--zettlr-editor-link-decoration': linkDecoration,
}

export const themeBordeauxLight = EditorView.theme({
  '&': bordeauxVarsLight,
  '.cm-link, .cm-strong, .cm-emphasis': { color: '#93a1a1' },
  // '.cm-citation-citekey': { color: '#d02325' },
}, { dark: false })

export const themeBordeauxDark = EditorView.theme({
  '&': bordeauxVarsDark,
  '.cm-link, .cm-strong, .cm-emphasis': { color: '#93a1a1' },
  // '.cm-citation-citekey': { color: '#d02325' },
}, { dark: true })
