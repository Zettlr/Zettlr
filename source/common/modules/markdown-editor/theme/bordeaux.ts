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
import { defaultVarsDark, defaultVarsLight, type ColorVars } from './main-override'

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

export const bordeauxVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': secondaryColor,
  '--cm-scroller-color': scrollerColor,
  '--cm-scroller-bg': scrollerBackground,
  '--cm-selection-color': selectionLight,
  '--cm-font': font,
  '--cm-code-font': codeFont,
  '--cm-error-color': errorColor,
  '--cm-link-decoration': linkDecoration,
}

export const bordeauxVarsDark: ColorVars = {
  ...defaultVarsDark,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': secondaryColor,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-scroller-bg': scrollerBackgroundDark,
  '--cm-selection-color': selectionDark,
  '--cm-highlight-color': highlightDark,
  '--cm-font': font,
  '--cm-code-font': codeFont,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-bg': codeBackgroundDark,
  '--cm-error-color': errorColor,
  '--cm-link-decoration': linkDecoration,
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
