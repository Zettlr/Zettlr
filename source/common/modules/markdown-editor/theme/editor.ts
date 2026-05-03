/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Editor Themes
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Base editor theme.
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'

// To add new variables:
//
// 1. Add the variable and type to `ThemeVars`
// 2. Set a default value in `defaultVarsLight` and `defaultVarsDark`
// 3. Apply the styling to each desired element in `editorTheme`
// 4. Optionally, override styling in the various `themes/*.ts` files
//
// To rename existing variables:
//
// 1. Change the name in `ThemeVars`
// 2. update `defaultVarsLight`, `defaultVarsDark` and any `themes/*.ts` files with the new name.
// 3. Update the name in `editorTheme`.
//    - This will not get flagged by intellisense,
//      so it requires a manual find-and-replace

export interface ThemeVars {
  [selector: string]: string|number // necessary to match the type of StyleSpec
  /** CSS `<color>` value */
  '--zettlr-editor-primary-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-secondary-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-scroller-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-scroller-bg': string
  /** CSS `<color>` value */
  '--zettlr-editor-selection-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-highlight-color': string
  /** CSS `font-family` value */
  '--zettlr-editor-font': string
  /** CSS `font-family` value */
  '--zettlr-editor-code-font': string
  /** CSS `font-size` value */
  '--zettlr-editor-font-size': string,
  /** CSS `line-height` value */
  '--zettlr-editor-line-height': string,
  /** CSS `font-weight` or `font-style` value */
  '--zettlr-editor-code-style': string,
  /** CSS `font-weight` or `font-style` value */
  '--zettlr-editor-emphasis-style': string
  /** CSS `font-weight` or `font-style` value */
  '--zettlr-editor-strong-style': string
  /** CSS `font-weight` or `font-style` value */
  '--zettlr-editor-header-style': string
  /** CSS `<color>` value */
  '--zettlr-editor-citation-color': string,
  /** CSS `<color>` value */
  '--zettlr-editor-citation-bg': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-code-bg': string
  /** CSS `<color>` value */
  '--zettlr-editor-escape-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-accent-color': string
  /** CSS `<color>` value */
  '--zettlr-editor-accent-bg': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-1-size': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-2-size': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-3-size': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-4-size': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-5-size': string
  /** CSS `font-size` value */
  '--zettlr-editor-header-6-size': string
  /** CSS `<color>` value */
  '--zettlr-editor-error-color': string
  /** CSS `opacity` value */
  '--zettlr-editor-opacity': string|number
  /** CSS `text-decoration` value */
  '--zettlr-editor-line-decoration': string
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
const lineHeight = '1.4'

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
  '--zettlr-editor-line-height': lineHeight,
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
  '--zettlr-editor-line-height': lineHeight,
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

export const editorTheme = EditorView.baseTheme({
  '.cm-scroller': {
    font: 'var(--zettlr-editor-font-size) var(--zettlr-editor-font)',
    lineHeight: 'var(--zettlr-editor-line-height)',
    color: 'var(--zettlr-editor-scroller-color)',
    backgroundColor: 'var(--zettlr-editor-scroller-bg)',
  },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: 'var(--zettlr-editor-selection-color)',
  },
  /**
   * Cursor blink animation.
   *
   * NOTE: We need to precisely override the way CodeMirror implements its
   * blink-animation.
   *
   * 1.) CodeMirror switches between "cm-blink" and "cm-blink2" classes:
   *     https://discuss.codemirror.net/t/custom-cursor-like-in-monaco-editor/5705/5
   * 2.) It uses two identical animations for that.
   * 3.) It uses a "step" animation to make the transition "harsh"
   * 4.) For the animation source code, see:
   *     https://github.com/codemirror/view/blob/main/src/theme.ts
   *
   * Our changes:
   * * Remove the steps(1)-function to remove the harsh transitions.
   * * Make the transition more smooth with a 15% opacity transition period.
   */
  '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
    animation: 'cm-blink 1.2s infinite'
  },
  '@keyframes cm-blink': {
    '0%': { opacity: 1 },
    '10%': { opacity: 1 },
    '25%': { opacity: 0 },
    '60%': { opacity: 0 },
    '75%': { opacity: 1 },
    '100%': { opacity: 1 }
  },
  '@keyframes cm-blink2': {
    '0%': { opacity: 1 },
    '10%': { opacity: 1 },
    '25%': { opacity: 0 },
    '60%': { opacity: 0 },
    '75%': { opacity: 1 },
    '100%': { opacity: 1 }
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
