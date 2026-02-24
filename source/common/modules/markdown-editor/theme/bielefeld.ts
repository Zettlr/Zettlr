/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Bielefeld Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Bielefeld theme styles
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import { defaultVarsDark, defaultVarsLight, type ThemeVars } from './main-override'

const primaryColor = '#ffb46c'

const scrollerBackground = 'var(--beige-0)'
const scrollerBackgroundDark = '#2b2b2c'

const selectionLight = '#cdcdaa'
const selectionDark = 'var(--grey-6)'

const fontFamily = '"Liberation Mono", monospace'
const codeFont = '"Liberation Mono", monospace'

const bielefeldVarsLight: ThemeVars = {
  ...defaultVarsLight,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': primaryColor,
  '--zettlr-editor-scroller-bg': scrollerBackground,
  '--zettlr-editor-selection-color': selectionLight,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-code-font': codeFont,
}

const bielefeldVarsDark: ThemeVars = {
  ...defaultVarsDark,
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': primaryColor,
  '--zettlr-editor-scroller-bg': scrollerBackgroundDark,
  '--zettlr-editor-selection-color': selectionDark,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-code-font': codeFont,
}

export const themeBielefeldLight = EditorView.theme({
  '&': bielefeldVarsLight
}, { dark: false })

export const themeBielefeldDark = EditorView.theme({
  '&': bielefeldVarsDark
}, { dark: true })
