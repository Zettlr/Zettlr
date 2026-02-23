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

const primaryColor = '#1cb27e'

const selectionLight = '#b4f0aacc'
const selectionDark = '#5aaa50cc'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

const berlinVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

const berlinVarsDark: ColorVars = {
  ...defaultVarsDark,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionDark,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

export const themeBerlinLight = EditorView.theme({
  '&': berlinVarsLight
}, { dark: false })

export const themeBerlinDark = EditorView.theme({
  '&': berlinVarsDark
}, { dark: true })
