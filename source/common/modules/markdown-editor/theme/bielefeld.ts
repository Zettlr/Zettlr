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
import { defaultVarsDark, defaultVarsLight, type ColorVars } from './main-override'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = 'var(--beige-0)'
const scrollerBackgroundDark = 'transparent'

const primaryColor = '#ffb46c'

const selectionLight = '#cdcdaa'
const selectionDark = 'var(--grey-6)'

const fontFamily = '"Liberation Mono", monospace'
const codeFont = '"Liberation Mono", monospace'

const citationColorDark = 'var(--grey-4)'
const citationBackgroundDark = 'var(--grey-7)'

const codeColorDark = 'var(--grey-0)'
const codeBackgroundDark = 'var(--grey-7)'

const bielefeldVarsLight: ColorVars = {
  ...defaultVarsLight,
  '--cm-scroller-color': scrollerColor,
  '--cm-scroller-bg': scrollerBackground,
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-selection-color': selectionLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
}

const bielefeldVarsDark: ColorVars = {
  ...defaultVarsDark,
  ...bielefeldVarsLight,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-scroller-bg': scrollerBackgroundDark,
  '--cm-selection-color': selectionDark,
  '--cm-citation-color': citationColorDark,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-color': codeColorDark,
  '--cm-code-bg': codeBackgroundDark,
}

export const themeBielefeldLight = EditorView.theme({
  '&': bielefeldVarsLight
}, { dark: false })

export const themeBielefeldDark = EditorView.theme({
  '&': bielefeldVarsDark
}, { dark: true })
