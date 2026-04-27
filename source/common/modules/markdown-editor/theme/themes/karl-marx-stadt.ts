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
import { type ThemeVars, defaultVarsDark, defaultVarsLight } from '../editor'

const primaryColor = '#dc2d2d'

const selectionLight = '#fbceb1'
const selectionDark = '#a32323b3'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

export const karlMarxStadtVarsLight: ThemeVars = {
  ...defaultVarsLight,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': primaryColor,
  '--zettlr-editor-selection-color': selectionLight,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-code-font': codeFont,
}

export const karlMarxStadtVarsDark: ThemeVars = {
  ...defaultVarsDark,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': primaryColor,
  '--zettlr-editor-selection-color': selectionDark,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-code-font': codeFont,
}

export const themeKarlMarxStadtLight = EditorView.theme({
  '&': karlMarxStadtVarsLight
}, { dark: false })

export const themeKarlMarxStadtDark = EditorView.theme({
  '&': karlMarxStadtVarsDark
}, { dark: true })
