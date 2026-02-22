/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Berlin Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Berlin theme styles
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { defaultVarsDark, defaultVarsLight, type ColorVars } from './main-override'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = 'transparent'

const primaryColor = '#1cb27e'

const selectionLight = '#b4f0aacc'
const selectionDark = '#5aaa50cc'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

const citationColor = 'var(--grey-1)'
const citationBackground = 'var(--grey-0)'

const codeColor = 'var(--grey-5)'
const codeBackground = 'var(--grey-0)'

const berlinVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-scroller-color': scrollerColor,
  '--cm-scroller-bg': scrollerBackground,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
  '--cm-citation-color': citationColor,
  '--cm-citation-bg': citationBackground,
  '--cm-code-color': codeColor,
  '--cm-code-bg': codeBackground,
}

const berlinVarsDark: ColorVars = {
  ...defaultVarsDark,
  ...berlinVarsLight,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-selection-color': selectionDark,
}

export const themeBerlinLight = EditorView.theme({
  '&': berlinVarsLight
}, { dark: false })

export const themeBerlinDark = EditorView.theme({
  '&': berlinVarsDark
}, { dark: true })
