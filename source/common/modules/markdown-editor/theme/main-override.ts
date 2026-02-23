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

export interface ColorVars {
  [selector: string]: string|number
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

const emphasisFont = 'italic'
const strongFont = 'bold'
const headerFont = 'bold'

const headerSize1 = '2em'
const headerSize2 = '1.8em'
const headerSize3 = '1.5em'
const headerSize4 = '1.3em'
const headerSize5 = '1em'
const headerSize6 = '1em'

export const defaultVarsLight: ColorVars = {
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

export const defaultVarsDark: ColorVars = {
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

const mainColorTheme = EditorView.baseTheme({
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
    color: 'var(--code-color)',
  },
  '.cm-block-comment': {
    color: 'var(--code-color)',
  },
  '.cm-monospace': {
    color: 'var(--code-color)',
    backgroundColor: 'var(--code-bg)',
  },
  '.cm-inline-math': {
    color: 'var(--code-color)',
  },
  '.citeproc-citation': {
    backgroundColor: 'var(--citation-bg)',
  },
  '.code-block-line-background': {
    backgroundColor: 'var(--code-bg)',
  },
  '.inline-code-background': {
    backgroundColor: 'var(--code-bg)',
  },
  '.cm-citation-mark': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--citation-color)',
  },
  '.cm-citation-at-sign': {
    fontFamily: 'var(--cm-code-font)',
    color: 'var(--citation-color)',
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
  '.cm-yaml-frontmatter-end': {
    fontFamily: 'var(--cm-code-font)',
    fontWeight: 'var(--cm-strong-font)',
    color: 'var(--cm-primary-color)',
  },
  '.cm-yaml-frontmatter-start': {
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

  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark': {
    color: 'inherit',
  },
})

const mainStyleTheme = EditorView.baseTheme({
  // General overrides
  '&.cm-editor': {
    height: '100%',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    cursor: 'auto',
  },
  '.cm-scroller': {
    flexGrow: '1', // Ensure the content pushes possible panels towards the edge
    outline: '0', // Remove the outline
  },
  // Hide overflowing text in autocompletion info panels
  '.cm-completionInfo': {
    overflow: 'hidden',
  },
  '.cm-panel.cm-search label input[type=checkbox]': {
    marginRight: '10px',
  },
  '.cm-panel.cm-search': {
    userSelect: 'none', // prevent search panel text elements from being selected
  },
  // TOOLTIPS
  '.cm-tooltip': {
    padding: '4px',
    maxWidth: '800px',
  },
  // Footnotes
  '.footnote, .footnote-ref-label': {
    verticalAlign: 'super',
    fontSize: '0.8rem',
  },
  // NOTE: Disabling because pre-rendered elements will not inherit this font size (see #5999)
  // '.footnote-ref': {
  //   fontSize: '0.8rem',
  // },
  // Provide the default YAML frontmatter indicator
  '.cm-yaml-frontmatter-start::after': {
    content: '"YAML Frontmatter"',
    display: 'inline-block',
    marginLeft: '10px',
    padding: '0px 5px',
    fontSize: '60%',
    fontWeight: 'normal',
    verticalAlign: 'middle',
    color: 'var(--grey-2)',
    backgroundColor: 'var(--grey-0)',
  },
  '&dark .cm-yaml-frontmatter-start::after': {
    color: 'var(--grey-0)',
    backgroundColor: 'var(--grey-4)',
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
  '@keyframes cm-blink': {
    '0%': { opacity: 1 },
    '10%': { opacity: 1 },
    '25%': { opacity: 0 },
    '60%': { opacity: 0 },
    '75%': { opacity: 1 },
    '100%': { opacity: 1 },
  },
  '@keyframes cm-blink2': {
    '0%': { opacity: 1 },
    '10%': { opacity: 1 },
    '25%': { opacity: 0 },
    '60%': { opacity: 0 },
    '75%': { opacity: 1 },
    '100%': { opacity: 1 },
  },
  '&.cm-focused > .cm-scroller > .cm-cursorLayer': {
    animation: 'cm-blink 1.2s infinite',
  },
})

export const mainOverride = [
  mainColorTheme,
  mainStyleTheme,
]
