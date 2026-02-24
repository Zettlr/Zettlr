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
  '--cm-primary-color': string
  '--cm-secondary-color': string
  '--cm-scroller-color': string
  '--cm-scroller-bg': string
  '--cm-selection-color': string
  '--cm-highlight-color': string
  '--cm-error-color': string
  '--cm-opacity': string|number
  '--cm-font': string
  '--cm-code-font': string
  '--cm-emphasis-font': string
  '--cm-strong-font': string
  '--cm-header-font': string
  '--cm-citation-color': string,
  '--cm-citation-bg': string
  '--cm-code-color': string
  '--cm-code-bg': string
  '--cm-escape-color': string
  '--cm-link-decoration': string
  '--cm-header-1-size': string
  '--cm-header-2-size': string
  '--cm-header-3-size': string
  '--cm-header-4-size': string
  '--cm-header-5-size': string
  '--cm-header-6-size': string
}

export interface CodeThemeVars {
  [selector: string]: string|number // necessary to match the type of StyleSpec
  '--cm-code-base-0': string
  '--cm-code-base-1': string
  '--cm-code-base-2': string
  '--cm-code-base-3': string
  '--cm-code-base-00': string
  '--cm-code-base-01': string
  '--cm-code-base-02': string
  '--cm-code-base-03': string
  '--cm-code-yellow': string
  '--cm-code-orange': string
  '--cm-code-red': string
  '--cm-code-magenta': string
  '--cm-code-violet': string
  '--cm-code-blue': string
  '--cm-code-cyan': string
  '--cm-code-green': string
}

const primaryColor = '#1cb27e'

const scrollerColor = 'var(--grey-5)'
const scrollerColorDark = 'var(--grey-0)'

const scrollerBackground = '#ffffff'
const scrollerBackgroundDark = '#2b2b2c'

const selectionLight = '#b0c6accc'
const selectionDark = '#5aaa50cc'

const highlightLight = '#ffff0080'
const highlightDark = '#ffff0060'

const fontFamily = '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
const codeFont = 'Inconsolata, monospace'

const emphasisFont = 'italic'
const strongFont = 'bold'
const headerFont = 'bold'

const citationColor = 'var(--grey-1)'
const citationColorDark = 'var(--grey-4)'

const citationBackground = 'var(--grey-0)'
const citationBackgroundDark = 'var(--grey-7)'

const codeColor = 'var(--grey-5)'
const codeColorDark = 'var(--grey-0)'

const codeBackground = 'var(--grey-0)'
const codeBackgroundDark = 'var(--grey-7)'

const escapeColor = 'var(--grey-2)'
const escapeColorDark = 'var(--grey-4)'

const errorColor = 'var(--red-2)'

const opacity = 0.65

const linkDecoration = 'none'

const headerSize1 = '2em'
const headerSize2 = '1.8em'
const headerSize3 = '1.5em'
const headerSize4 = '1.3em'
const headerSize5 = '1em'
const headerSize6 = '1em'

export const defaultVarsLight: ThemeVars = {
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-scroller-color': scrollerColor,
  '--cm-scroller-bg': scrollerBackground,
  '--cm-selection-color': selectionLight,
  '--cm-highlight-color': highlightLight,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
  '--cm-emphasis-font': emphasisFont,
  '--cm-strong-font': strongFont,
  '--cm-header-font': headerFont,
  '--cm-citation-color': citationColor,
  '--cm-citation-bg': citationBackground,
  '--cm-code-color': codeColor,
  '--cm-code-bg': codeBackground,
  '--cm-escape-color': escapeColor,
  '--cm-error-color': errorColor,
  '--cm-opacity': opacity,
  '--cm-link-decoration': linkDecoration,
  '--cm-header-1-size': headerSize1,
  '--cm-header-2-size': headerSize2,
  '--cm-header-3-size': headerSize3,
  '--cm-header-4-size': headerSize4,
  '--cm-header-5-size': headerSize5,
  '--cm-header-6-size': headerSize6,
}

export const defaultVarsDark: ThemeVars = {
  '--cm-primary-color': primaryColor,
  '--cm-secondary-color': primaryColor,
  '--cm-scroller-color': scrollerColorDark,
  '--cm-scroller-bg': scrollerBackgroundDark,
  '--cm-selection-color': selectionDark,
  '--cm-highlight-color': highlightDark,
  '--cm-font': fontFamily,
  '--cm-code-font': codeFont,
  '--cm-emphasis-font': emphasisFont,
  '--cm-strong-font': strongFont,
  '--cm-header-font': headerFont,
  '--cm-citation-color': citationColorDark,
  '--cm-citation-bg': citationBackgroundDark,
  '--cm-code-color': codeColorDark,
  '--cm-code-bg': codeBackgroundDark,
  '--cm-escape-color': escapeColorDark,
  '--cm-error-color': errorColor,
  '--cm-opacity': opacity,
  '--cm-link-decoration': linkDecoration,
  '--cm-header-1-size': headerSize1,
  '--cm-header-2-size': headerSize2,
  '--cm-header-3-size': headerSize3,
  '--cm-header-4-size': headerSize4,
  '--cm-header-5-size': headerSize5,
  '--cm-header-6-size': headerSize6,
}

export const defaultLight = EditorView.theme({
  '&': defaultVarsLight
}, { dark: false })

export const defaultDark = EditorView.theme({
  '&': defaultVarsDark
}, { dark: true })

const mainTheme = EditorView.baseTheme({
  '.cm-scroller': {
    fontFamily: 'var(--cm-font)',
    color: 'var(--cm-scroller-color)',
    backgroundColor: 'var(--cm-scroller-bg)',
  },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: 'var(--cm-selection-color)',
  },
  '.cm-comment': {
    color: 'var(--cm-code-color)',
  },
  '.cm-block-comment': {
    color: 'var(--cm-code-color)',
  },
  '.cm-monospace': {
    color: 'var(--cm-code-color)',
    backgroundColor: 'var(--cm-code-bg)',
  },
  '.cm-inline-math': {
    color: 'var(--cm-code-color)',
  },
  '.citeproc-citation': {
    backgroundColor: 'var(--cm-citation-bg)',
  },
  '.code-block-line-background': {
    backgroundColor: 'var(--cm-code-bg)',
  },
  '.inline-code-background': {
    backgroundColor: 'var(--cm-code-bg)',
  },
  '.cm-citation-mark': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--cm-citation-color)',
  },
  '.cm-citation-at-sign': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--cm-citation-color)',
  },
  '.cm-escape': {
    color: 'var(--cm-escape-color)',
  },
  '.blockquote-wrapper': {
    borderLeftColor: 'var(--cm-primary-color)',
  },
  '.citeproc-citation.error': {
    color: 'var(--cm-error-color)',
  },
  '.cm-citation-citekey': {
    color: 'var(--cm-secondary-color)',
  },
  '.cm-citation-locator': {
    fontStyle: 'var(--cm-emphasis-font)',
  },
  '.cm-citation-suppress-author-flag': {
    color: 'var(--cm-error-color)',
  },
  '.cm-citation': {
    color: 'var(--cm-citation-color)',
  },
  '.cm-code-mark:not(.cm-emphasis, .cm-strong, .cm-list)': {
    color: 'var(--cm-primary-color)',
  },
  '.cm-code-mark': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--cm-primary-color)',
  },
  '.cm-cursor-primary': {
    background: 'var(--cm-primary-color)',
  },
  '.cm-cursor-secondary': {
    background: 'var(--cm-error-color)',
  },
  '.cm-dropCursor': {
    borderLeftColor: 'var(--cm-primary-color)',
  },
  '.cm-emphasis': {
    fontStyle: 'var(--cm-emphasis-font)',
  },
  '.cm-gutters': {
    fontFamily: 'var(--cm-code-font)',
  },
  '.cm-highlight': {
    backgroundColor: 'var(--cm-highlight-color)',
  },
  '.cm-hr':  {
    fontFamily: 'var(--cm-code-font)',
    fontWeight: 'var(--cm-strong-font)',
    color: 'var(--cm-primary-color)',
  },
  '.cm-link': {
    color: 'var(--cm-primary-color)',
    textDecoration: 'var(--cm-link-decoration)',
  },
  '.cm-strong': {
    fontWeight: 'var(--cm-strong-font)',
  },
  '.cm-url': {
    color: 'var(--cm-primary-color)',
    textDecoration: 'var(--cm-link-decoration)',
  },
  '.cm-yaml-frontmatter-start': {
    fontFamily: 'var(--cm-code-font)',
    fontWeight: 'var(--cm-strong-font)',
    color: 'var(--cm-primary-color)',
  },
  '.cm-yaml-frontmatter-end': {
    fontFamily: 'var(--cm-code-font)',
    fontWeight: 'var(--cm-strong-font)',
    color: 'var(--cm-primary-color)',
  },
  '.cm-zkn-link': {
    textDecoration: 'var(--cm-link-decoration)',
  },
  '.cm-zkn-tag':  {
    color: 'var(--cm-primary-color)',
  },
  '.mermaid-chart.error': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--cm-error-color)',
  },
  'pandoc-div-info-wrapper': {
    backgroundColor: 'var(--cm-scroller-bg)',
  },
  '.cm-header-1, .cm-header-2, .cm-header-3, .cm-header-4, .cm-header-5, .cm-header-6': {
    fontWeight: 'var(--cm-header-font)'
  },
  // Don't increase font-size within blockquotes
  '.cm-line:has(:not(.cm-quote).cm-header-1)': { fontSize: 'var(--cm-header-1-size)' },
  '.cm-line:has(:not(.cm-quote).cm-header-2)': { fontSize: 'var(--cm-header-2-size)' },
  '.cm-line:has(:not(.cm-quote).cm-header-3)': { fontSize: 'var(--cm-header-3-size)' },
  '.cm-line:has(:not(.cm-quote).cm-header-4)': { fontSize: 'var(--cm-header-4-size)' },
  '.cm-line:has(:not(.cm-quote).cm-header-5)': { fontSize: 'var(--cm-header-5-size)' },
  '.cm-line:has(:not(.cm-quote).cm-header-6)': { fontSize: 'var(--cm-header-6-size)' },

  // These styles use system-wide variables
  // TODO: migrate them to theme variables
  '.cm-bracket': {
    color: 'var(--grey-1)',
  },
  // Shown when a region is folded
  '.cm-foldPlaceholder': {
    backgroundColor: 'transparent',
  },
  '&dark .cm-foldPlaceholder': {
    borderColor: 'var(--grey-3)',
  },
  '.cm-definition-operator': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--grey-5)',
  },
  '.cm-angle-bracket': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--grey-5)',
  },
  '.cm-attribute-name': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--blue-0)',
  },
  '.cm-attribute-value': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--green-0)',
  },
  '.cm-string': {
    color: 'var(--green-0)',
  },
  '.cm-tag-name': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--orange-2)',
  },
  '.cm-heading': {
    textDecoration: 'none',
  },

  // Provide the default YAML frontmatter indicator
  '.cm-yaml-frontmatter-start::after': {
    color: 'var(--grey-2)',
    backgroundColor: 'var(--grey-0)',
  },
  '&dark .cm-yaml-frontmatter-start::after': {
    color: 'var(--grey-0)',
    backgroundColor: 'var(--grey-4)',
  },

  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark': {
    color: 'inherit',
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
  '--cm-code-base-0': BASE_0,
  '--cm-code-base-1': BASE_1,
  '--cm-code-base-2': BASE_2,
  '--cm-code-base-3': BASE_3,
  '--cm-code-base-00': BASE_00,
  '--cm-code-base-01': BASE_01,
  '--cm-code-base-02': BASE_02,
  '--cm-code-base-03': BASE_03,
  '--cm-code-yellow': YELLOW,
  '--cm-code-orange': ORANGE,
  '--cm-code-red': RED,
  '--cm-code-magenta': MAGENTA,
  '--cm-code-violet': VIOLET,
  '--cm-code-blue': BLUE,
  '--cm-code-cyan': CYAN,
  '--cm-code-green': GREEN,
}

export const codeTheme = EditorView.baseTheme({
  '&': defaultCodeVars,
  '.code': {
    color: 'var(--cm-code-base-02)',
    fontFamily: 'var(--cm-code-font)'
  },
  '&dark .code': { color: 'var(--cm-code-base-1)' },

  '.code .cm-comment': { color: 'var(--cm-code-base-00)' },
  '.code .cm-line-comment': { color: 'var(--cm-code-base-00)' },
  '.code .cm-block-comment': { color: 'var(--cm-code-base-00)' },

  // Sort based on color; roughly sort based on function of the class.
  '.code .cm-string': { color: 'var(--cm-code-green)' },
  '.code .cm-keyword': { color: 'var(--cm-code-green)' },
  '.code .cm-inserted': { color: 'var(--cm-code-green)' },
  '.code .cm-positive': { color: 'var(--cm-code-green)' },

  '.code .cm-control-keyword': { color: 'var(--cm-code-violet)' },
  '.code .cm-atom': { color: 'var(--cm-code-violet)' },
  '.code .cm-color': { color: 'var(--cm-code-violet)' },
  '.code .cm-number': { color: 'var(--cm-code-violet)' },
  '.code .cm-integer': { color: 'var(--cm-code-violet)' },
  '.code .cm-bool': { color: 'var(--cm-code-violet)' },

  '.code .cm-property': { color: 'var(--cm-code-magenta)' },
  '.code .cm-operator': { color: 'var(--cm-code-magenta)' },
  '.code .cm-compare-operator': { color: 'var(--cm-code-magenta)' },
  '.code .cm-arithmetic-operator': { color: 'var(--cm-code-magenta)' },
  '.code .cm-self': { color: 'var(--cm-code-magenta)' },

  '.code .cm-operator-keyword': { color: 'var(--cm-code-blue)' },
  '.code .cm-definition-keyword': { color: 'var(--cm-code-blue)' },
  '.code .cm-module-keyword': { color: 'var(--cm-code-blue)' },
  '.code .cm-null': { color: 'var(--cm-code-blue)' },
  '.code .cm-meta': { color: 'var(--cm-code-blue)' },
  '.code .cm-unit': { color: 'var(--cm-code-blue)' },
  '.code .cm-qualifier': { color: 'var(--cm-code-blue)' },
  '.code .cm-builtin': { color: 'var(--cm-code-blue)' },
  '.code .cm-property-name': { color: 'var(--cm-code-blue)' },

  '.code .cm-tag-name': { color: 'var(--cm-code-cyan)' },
  '.code .cm-modifier': { color: 'var(--cm-code-cyan)' },
  '.code .cm-variable-name': { color: 'var(--cm-code-cyan)' },
  '.code .cm-variable': { color: 'var(--cm-code-cyan)' },

  '.code .cm-attribute-name': { color: 'var(--cm-code-orange)' },
  '.code .cm-regexp': { color: 'var(--cm-code-orange)' },

  '.code .cm-name': { color: 'var(--cm-code-yellow)' },
  '.code .cm-class-name': { color: 'var(--cm-code-yellow)' },
  '.code .cm-type-name': { color: 'var(--cm-code-yellow)' },
  '.code .cm-changed': { color: 'var(--cm-code-yellow)' },

  '.code .cm-deleted': { color: 'var(--cm-code-red)' },
  '.code .cm-negative': { color: 'var(--cm-code-red)' },
  '.code .cm-invalid': { color: 'var(--cm-code-red)' },
})

export const mainOverride = [
  mainTheme,
  codeTheme
]
