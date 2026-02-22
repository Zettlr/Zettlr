/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Karl-Marx-Stadt Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Karl-Marx-Stadt theme styles
 *
 * END HEADER
 */
import { EditorView } from '@codemirror/view'
import { type ColorVars, defaultVarsDark, defaultVarsLight } from './main-override'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = 'transparent'

const primaryColor = '#dc2d2d'

const selectionLight = '#fbceb1'
const selectionDark = '#a32323b3'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

const citationColor = 'var(--grey-1)'
const citationColorDark = 'var(--grey-4)'

const citationBackground = 'var(--grey-0)'
const citationBackgroundDark = 'var(--grey-7)'

const codeColor = 'var(--grey-5)'
const codeColorDark = 'var(--grey-0)'

const codeBackground = 'var(--grey-0)'
const codeBackgroundDark = 'var(--grey-7)'

export const karlMarxStadtVarsLight: ColorVars = {
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

export const karlMarxStadtVarsDark: ColorVars = {
  ...defaultVarsDark,
  ...karlMarxStadtVarsLight,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-selection-color': selectionDark,
  '--cm-citation-color': citationColorDark,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-color': codeColorDark,
  '--cm-code-bg': codeBackgroundDark,
}

export const themeKarlMarxStadtLight = EditorView.theme({
  '&': defaultVarsLight
}, { dark: false })

export const themeKarlMarxStadtDark = EditorView.theme({
  '&': defaultVarsDark
}, { dark: true })
