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
import { type ThemeVars, defaultVarsDark, defaultVarsLight } from './main-override'

const primaryColor = '#1d75b3'

const selectionLight = '#c8dcf0cc'
const selectionDark = '#1d3786cc'

const fontFamily = 'Crimson, serif'
const codeFont = 'Inconsolata, monospace'

export const frankfurtVarsLight: ThemeVars = {
  ...defaultVarsLight,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

export const frankfurtVarsDark: ThemeVars = {
  ...defaultVarsDark,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionDark,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

export const themeFrankfurtLight = EditorView.theme({
  '&': frankfurtVarsLight
}, { dark: false })

export const themeFrankfurtDark = EditorView.theme({
  '&': frankfurtVarsDark
}, { dark: true })
