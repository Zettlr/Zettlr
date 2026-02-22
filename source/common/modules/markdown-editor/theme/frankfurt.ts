/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Frankfurt Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Frankfurt theme styles
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { type ColorVars, defaultVarsDark, defaultVarsLight } from './main-override'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = 'transparent'

const primaryColor = '#1d75b3'

const selectionLight = '#c8dcf0cc'
const selectionDark = '#1d3786cc'

const fontFamily = 'Crimson, serif'
const codeFont = 'Inconsolata, monospace'

const citationColor = 'var(--grey-1)'
const citationColorDark = 'var(--grey-4)'

const citationBackground = 'var(--grey-0)'
const citationBackgroundDark = 'var(--grey-7)'

const codeColor = 'var(--grey-5)'
const codeColorDark = 'var(--grey-0)'

const codeBackground = 'var(--grey-0)'
const codeBackgroundDark = 'var(--grey-7)'

export const frankfurtVarsLight: ColorVars = {
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

export const frankfurtVarsDark: ColorVars = {
  ...defaultVarsDark,
  ...frankfurtVarsLight,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-selection-color': selectionDark,
  '--cm-citation-color': citationColorDark,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-color': codeColorDark,
  '--cm-code-bg': codeBackgroundDark,
}

export const themeFrankfurtLight = EditorView.theme({
  '&': frankfurtVarsLight
}, { dark: false })

export const themeFrankfurtDark = EditorView.theme({
  '&': frankfurtVarsDark
}, { dark: true })
