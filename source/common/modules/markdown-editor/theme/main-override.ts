/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Main Override Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exports the base editor theme which configures the
 *                  main editor in such a way that it fits within the general
 *                  appearance of Zettlr.
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'

export interface ThemeVars {
  [selector: string]: string|number // necessary to match the type of StyleSpec
  '--zettlr-editor-primary-color': string
  '--zettlr-editor-secondary-color': string
  '--zettlr-editor-scroller-color': string
  '--zettlr-editor-scroller-bg': string
  '--zettlr-editor-selection-color': string
  '--zettlr-editor-highlight-color': string
  '--zettlr-editor-font': string
  '--zettlr-editor-font-size': string,
  '--zettlr-editor-code-font': string
  '--zettlr-editor-code-style': string,
  '--zettlr-editor-emphasis-style': string
  '--zettlr-editor-strong-style': string
  '--zettlr-editor-header-style': string
  '--zettlr-editor-citation-color': string,
  '--zettlr-editor-citation-bg': string
  '--zettlr-editor-code-color': string
  '--zettlr-editor-code-bg': string
  '--zettlr-editor-escape-color': string
  '--zettlr-editor-accent-color': string
  '--zettlr-editor-accent-bg': string
  '--zettlr-editor-header-1-size': string
  '--zettlr-editor-header-2-size': string
  '--zettlr-editor-header-3-size': string
  '--zettlr-editor-header-4-size': string
  '--zettlr-editor-header-5-size': string
  '--zettlr-editor-header-6-size': string
  '--zettlr-editor-error-color': string
  '--zettlr-editor-opacity': string|number
  '--zettlr-editor-line-decoration': string
}

export interface CodeThemeVars {
  [selector: string]: string|number // necessary to match the type of StyleSpec
  '--zettlr-editor-code-base-0': string
  '--zettlr-editor-code-base-1': string
  '--zettlr-editor-code-base-2': string
  '--zettlr-editor-code-base-3': string
  '--zettlr-editor-code-base-00': string
  '--zettlr-editor-code-base-01': string
  '--zettlr-editor-code-base-02': string
  '--zettlr-editor-code-base-03': string
  '--zettlr-editor-code-yellow': string
  '--zettlr-editor-code-orange': string
  '--zettlr-editor-code-red': string
  '--zettlr-editor-code-magenta': string
  '--zettlr-editor-code-violet': string
  '--zettlr-editor-code-blue': string
  '--zettlr-editor-code-cyan': string
  '--zettlr-editor-code-green': string
}

const primaryColor = '#1cb27e'
const secondaryColor = primaryColor

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = '#ffffff'
const scrollerBackgroundDark = '#2b2b2c'

const selectionLight = '#b0c6accc'
const selectionDark = '#5aaa50cc'

const highlightLight = '#ffff0080'
const highlightDark = '#ffff0060'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const fontSize = '1em'

const codeFont = 'Inconsolata, monospace'
const codeStyle = 'normal'

const emphasisStyle = 'italic'
const strongStyle = 'bold'
const headerStyle = 'bold'

const citationColor = 'var(--grey-1)'
const citationColorDark = 'var(--grey-4)'

const citationBackground = 'var(--grey-0)'
const citationBackgroundDark = 'var(--grey-7)'

const codeColor = 'var(--grey-4)'
const codeColorDark = 'var(--grey-2)'

const codeBackground = 'var(--grey-0)'
const codeBackgroundDark = 'var(--grey-7)'

const escapeColor = 'var(--grey-2)'
const escapeColorDark = 'var(--grey-4)'

const accentColor = 'var(--grey-0)'
const accentColorDark = 'var(--grey-2)'

const accentBackground = 'var(--grey-2)'
const accentBackgroundDark = 'var(--grey-4)'

const headerSize1 = '2em'
const headerSize2 = '1.8em'
const headerSize3 = '1.5em'
const headerSize4 = '1.3em'
const headerSize5 = '1em'
const headerSize6 = '1em'

const errorColor = 'var(--red-2)'

const opacity = 0.65

const linkDecoration = 'none'

export const defaultVarsLight: ThemeVars = {
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': secondaryColor,
  '--zettlr-editor-scroller-color': scrollerColor,
  '--zettlr-editor-scroller-bg': scrollerBackground,
  '--zettlr-editor-selection-color': selectionLight,
  '--zettlr-editor-highlight-color': highlightLight,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-font-size': fontSize,
  '--zettlr-editor-code-font': codeFont,
  '--zettlr-editor-code-style': codeStyle,
  '--zettlr-editor-emphasis-style': emphasisStyle,
  '--zettlr-editor-strong-style': strongStyle,
  '--zettlr-editor-header-style': headerStyle,
  '--zettlr-editor-citation-color': citationColor,
  '--zettlr-editor-citation-bg': citationBackground,
  '--zettlr-editor-code-color': codeColor,
  '--zettlr-editor-code-bg': codeBackground,
  '--zettlr-editor-escape-color': escapeColor,
  '--zettlr-editor-accent-color': accentColor,
  '--zettlr-editor-accent-bg': accentBackground,
  '--zettlr-editor-header-1-size': headerSize1,
  '--zettlr-editor-header-2-size': headerSize2,
  '--zettlr-editor-header-3-size': headerSize3,
  '--zettlr-editor-header-4-size': headerSize4,
  '--zettlr-editor-header-5-size': headerSize5,
  '--zettlr-editor-header-6-size': headerSize6,
  '--zettlr-editor-error-color': errorColor,
  '--zettlr-editor-opacity': opacity,
  '--zettlr-editor-line-decoration': linkDecoration,
}

export const defaultVarsDark: ThemeVars = {
  '--zettlr-editor-primary-color': primaryColor,
  '--zettlr-editor-secondary-color': secondaryColor,
  '--zettlr-editor-scroller-color': scrollerColorDark,
  '--zettlr-editor-scroller-bg': scrollerBackgroundDark,
  '--zettlr-editor-selection-color': selectionDark,
  '--zettlr-editor-highlight-color': highlightDark,
  '--zettlr-editor-font': fontFamily,
  '--zettlr-editor-font-size': fontSize,
  '--zettlr-editor-code-font': codeFont,
  '--zettlr-editor-code-style': codeStyle,
  '--zettlr-editor-emphasis-style': emphasisStyle,
  '--zettlr-editor-strong-style': strongStyle,
  '--zettlr-editor-header-style': headerStyle,
  '--zettlr-editor-citation-color': citationColorDark,
  '--zettlr-editor-citation-bg': citationBackgroundDark,
  '--zettlr-editor-code-color': codeColorDark,
  '--zettlr-editor-code-bg': codeBackgroundDark,
  '--zettlr-editor-escape-color': escapeColorDark,
  '--zettlr-editor-accent-color': accentColorDark,
  '--zettlr-editor-accent-bg': accentBackgroundDark,
  '--zettlr-editor-header-1-size': headerSize1,
  '--zettlr-editor-header-2-size': headerSize2,
  '--zettlr-editor-header-3-size': headerSize3,
  '--zettlr-editor-header-4-size': headerSize4,
  '--zettlr-editor-header-5-size': headerSize5,
  '--zettlr-editor-header-6-size': headerSize6,
  '--zettlr-editor-error-color': errorColor,
  '--zettlr-editor-opacity': opacity,
  '--zettlr-editor-line-decoration': linkDecoration,
}

export const defaultLight = EditorView.theme({
  '&': defaultVarsLight
}, { dark: false })

export const defaultDark = EditorView.theme({
  '&': defaultVarsDark
}, { dark: true })

const mainTheme = EditorView.baseTheme({
  '.cm-scroller': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
    color: 'var(--zettlr-editor-scroller-color)',
    backgroundColor: 'var(--zettlr-editor-scroller-bg)',
  },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: 'var(--zettlr-editor-selection-color)',
  },
  '.cm-monospace': {
    color: 'var(--zettlr-editor-code-color)',
    backgroundColor: 'var(--zettlr-editor-code-bg)',
  },
  '.cm-inline-math': {
    color: 'var(--zettlr-editor-code-color)',
  },
  '.citeproc-citation': {
    backgroundColor: 'var(--zettlr-editor-citation-bg)',
  },
  '.code-block-line-background': {
    backgroundColor: 'var(--zettlr-editor-code-bg)',
  },
  '.inline-code-background': {
    backgroundColor: 'var(--zettlr-editor-code-bg)',
  },
  '.cm-escape': {
    color: 'var(--zettlr-editor-escape-color)',
  },
  '.blockquote-wrapper': {
    borderLeftColor: 'var(--zettlr-editor-primary-color)',
  },
  '.citeproc-citation.error': {
    color: 'var(--zettlr-editor-error-color)',
  },
  '.cm-citation-mark': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
    color: 'var(--zettlr-editor-citation-color)',
  },
  '.cm-citation-at-sign': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
    color: 'var(--zettlr-editor-citation-color)',
  },
  '.cm-citation-citekey': {
    color: 'var(--zettlr-editor-secondary-color)',
  },
  '.cm-citation-locator': {
    font: 'var(--zettlr-editor-emphasis-style) var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
    textDecoration: 'var(--zettlr-editor-line-decoration)'
  },
  '.cm-citation-suppress-author-flag': {
    color: 'var(--zettlr-editor-error-color)',
  },
  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark': {
    color: 'inherit',
  },
  // Don't change the font for `*`, `-`, and `_`, `#` etc. formatting characters
  '.cm-code-mark:not(.cm-emphasis, .cm-strong, .cm-list)': {
    font: 'var(--zettlr-editor-code-style) var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
  },
  '.cm-code-mark': {
    color: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-cursor-primary': {
    background: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-cursor-secondary': {
    background: 'var(--zettlr-editor-error-color)',
  },
  '.cm-dropCursor': {
    borderLeftColor: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-emphasis': {
    font: 'var(--zettlr-editor-emphasis-style) var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
  },
  // Shown when a region is folded
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
    borderColor: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-gutters': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
  },
  '.cm-highlight': {
    backgroundColor: 'var(--zettlr-editor-highlight-color)',
  },
  '.cm-hr':  {
    font: 'var(--zettlr-editor-strong-style) var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
    color: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-info-string': {
    opacity: 'var(--zettlr-editor-opacity)',
  },
  '.cm-link': {
    color: 'var(--zettlr-editor-primary-color)',
    textDecoration: 'var(--zettlr-editor-line-decoration)',
  },
  '.cm-string': {
    color: 'var(--zettlr-editor-secondary-color)',
  },
  '.cm-strong': {
    font: 'var(--zettlr-editor-strong-style) var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
  },
  '.cm-url': {
    color: 'var(--zettlr-editor-primary-color)',
    textDecoration: 'var(--zettlr-editor-line-decoration)',
  },
  '.cm-yaml-frontmatter-start': {
    font: 'var(--zettlr-editor-strong-style) var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
    color: 'var(--zettlr-editor-primary-color)',
  },
  '.cm-yaml-frontmatter-end': {
    font: 'var(--zettlr-editor-strong-style) var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',
    color: 'var(--zettlr-editor-primary-color)',
  },
  // Provide the default YAML frontmatter indicator
  '.cm-yaml-frontmatter-start::after': {
    color: 'var(--zettlr-editor-accent-color)',
    backgroundColor: 'var(--zettlr-editor-accent-bg)',
  },
  '.cm-zkn-link': {
    textDecoration: 'var(--zettlr-editor-line-decoration)',
  },
  '.cm-zkn-tag':  {
    color: 'var(--zettlr-editor-primary-color)',
  },
  '.mermaid-chart.error': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-code-font)',    color: 'var(--zettlr-editor-error-color)',
  },
  'pandoc-div-info-wrapper': {
    backgroundColor: 'var(--zettlr-editor-scroller-bg)',
  },
  '.cm-heading': {
    textDecoration: 'var(--zettlr-editor-line-decoration)',
  },
  // Don't increase font-size within blockquotes
  '.cm-line:has(:not(.cm-quote).cm-header-1)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-1-size) var(--zettlr-editor-font)',
    // TODO: find a better way to override the `cm-code-mark` styling above
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
  '.cm-line:has(:not(.cm-quote).cm-header-2)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-2-size) var(--zettlr-editor-font)',
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
  '.cm-line:has(:not(.cm-quote).cm-header-3)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-3-size) var(--zettlr-editor-font)',
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
  '.cm-line:has(:not(.cm-quote).cm-header-4)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-4-size) var(--zettlr-editor-font)',
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
  '.cm-line:has(:not(.cm-quote).cm-header-5)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-5-size) var(--zettlr-editor-font)',
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
  '.cm-line:has(:not(.cm-quote).cm-header-6)': {
    font: 'var(--zettlr-editor-header-style) var(--zettlr-editor-header-6-size) var(--zettlr-editor-font)',
    '--zettlr-editor-code-style': 'var(--zettlr-editor-header-style)',
  },
})

/* Code Theme
 *
 * We're using this solarized theme here: https://ethanschoonover.com/solarized/
 * See also the CodeEditor.vue component, which uses the same colours
*/

const BASE_0 = '#839496'
const BASE_1 = '#93a1a1'
const BASE_2 = '#eee8d5'
const BASE_3 = '#fdf6e3'
const BASE_00 = '#657b83'
const BASE_01 = '#586e75'
const BASE_02 = '#073642'
const BASE_03 = '#002b36'

const YELLOW = '#b58900'
const ORANGE = '#cb4b16'
const RED = '#dc322f'
const MAGENTA = '#d33682'
const VIOLET = '#6c71c4'
const BLUE = '#268bd2'
const CYAN = '#2aa198'
const GREEN = '#859900'

export const defaultCodeVars: CodeThemeVars = {
  '--zettlr-editor-code-base-0': BASE_0,
  '--zettlr-editor-code-base-1': BASE_1,
  '--zettlr-editor-code-base-2': BASE_2,
  '--zettlr-editor-code-base-3': BASE_3,
  '--zettlr-editor-code-base-00': BASE_00,
  '--zettlr-editor-code-base-01': BASE_01,
  '--zettlr-editor-code-base-02': BASE_02,
  '--zettlr-editor-code-base-03': BASE_03,
  '--zettlr-editor-code-yellow': YELLOW,
  '--zettlr-editor-code-orange': ORANGE,
  '--zettlr-editor-code-red': RED,
  '--zettlr-editor-code-magenta': MAGENTA,
  '--zettlr-editor-code-violet': VIOLET,
  '--zettlr-editor-code-blue': BLUE,
  '--zettlr-editor-code-cyan': CYAN,
  '--zettlr-editor-code-green': GREEN,
}

export const codeTheme = EditorView.baseTheme({
  '&': defaultCodeVars,
  '.code': {
    color: 'var(--zettlr-editor-code-base-02)',
    fontFamily: 'var(--zettlr-editor-code-font)'
  },
  '&dark .code': { color: 'var(--zettlr-editor-code-base-1)' },

  '.cm-comment': { color: 'var(--zettlr-editor-code-base-00)' },
  '.cm-line-comment': { color: 'var(--zettlr-editor-code-base-00)' },
  '.cm-block-comment': { color: 'var(--zettlr-editor-code-base-00)' },

  // Sort based on color; roughly sort based on function of the class.
  '.cm-string': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-keyword': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-inserted': { color: 'var(--zettlr-editor-code-green)' },
  '.cm-positive': { color: 'var(--zettlr-editor-code-green)' },

  '.cm-control-keyword': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-atom': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-color': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-number': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-integer': { color: 'var(--zettlr-editor-code-violet)' },
  '.cm-bool': { color: 'var(--zettlr-editor-code-violet)' },

  '.cm-property': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-compare-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-arithmetic-operator': { color: 'var(--zettlr-editor-code-magenta)' },
  '.cm-self': { color: 'var(--zettlr-editor-code-magenta)' },

  '.cm-operator-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-definition-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-module-keyword': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-null': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-meta': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-unit': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-qualifier': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-builtin': { color: 'var(--zettlr-editor-code-blue)' },
  '.cm-property-name': { color: 'var(--zettlr-editor-code-blue)' },

  '.cm-tag-name': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-modifier': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-variable-name': { color: 'var(--zettlr-editor-code-cyan)' },
  '.cm-variable': { color: 'var(--zettlr-editor-code-cyan)' },

  '.cm-attribute-name': { color: 'var(--zettlr-editor-code-orange)' },
  '.cm-regexp': { color: 'var(--zettlr-editor-code-orange)' },

  '.cm-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-class-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-type-name': { color: 'var(--zettlr-editor-code-yellow)' },
  '.cm-changed': { color: 'var(--zettlr-editor-code-yellow)' },

  '.cm-deleted': { color: 'var(--zettlr-editor-code-red)' },
  '.cm-negative': { color: 'var(--zettlr-editor-code-red)' },
  '.cm-invalid': { color: 'var(--zettlr-editor-code-red)' },
})

export const mainOverride = [
  mainTheme,
  codeTheme
]
