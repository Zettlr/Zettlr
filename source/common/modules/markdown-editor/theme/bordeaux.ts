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

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = '#839496'

const scrollerBackground = '#fffff8'
const scrollerBackgroundDark = '#002b36'

const primaryColor = '#1bd4e9'

const selectionLight = '#b8f0f6cc'
const selectionDark = '#0c616acc'

const highlightDark = 'black'

const font = 'Inconsolata, monospace'
const codeFont = 'Inconsolata, monospace'

const citationColor =  'var(--grey-1)'
const citationColorDark = 'var(--grey-4)'

const citationBackground = 'var(--grey-0)'
const citationBackgroundDark = '#002024'

const codeColor = 'var(--grey-5)'
const codeColorDark = 'var(--grey-0)'

const errorColor = '#d02325'

const codeBackground = 'var(--grey-0)'
const codeBackgroundDark = '#002024'

const linkDecoration = 'underline'

export const bordeauxVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-scroller-color': scrollerColor,
  '--cm-scroller-bg': scrollerBackground,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': font,
  '--cm-code-font': codeFont,
  '--cm-citation-color': citationColor,
  '--cm-citation-bg': citationBackground,
  '--cm-code-color': codeColor,
  '--cm-code-bg': codeBackground,
  '--cm-error-color': errorColor,
  '--cm-link-decoration': linkDecoration,
}

export const bordeauxVarsDark: ColorVars = {
  ...defaultVarsDark,
  ...bordeauxVarsLight,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-scroller-bg': scrollerBackgroundDark,
  '--cm-selection-color': selectionDark,
  '--cm-highlight-color': highlightDark,
  '--cm-citation-color': citationColorDark,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-color': codeColorDark,
  '--cm-code-bg': codeBackgroundDark,
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
