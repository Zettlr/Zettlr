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

const primaryColor = '#dc2d2d'

const selectionLight = '#fbceb1'
const selectionDark = '#a32323b3'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

export const karlMarxStadtVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

export const karlMarxStadtVarsDark: ColorVars = {
  ...defaultVarsDark,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionDark,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

export const themeKarlMarxStadtLight = EditorView.theme({
  '&': karlMarxStadtVarsLight
}, { dark: false })

export const themeKarlMarxStadtDark = EditorView.theme({
  '&': karlMarxStadtVarsDark
}, { dark: true })
