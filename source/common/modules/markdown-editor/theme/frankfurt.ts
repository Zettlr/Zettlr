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

const primaryColor = 'rgb(29, 117, 179)'
const blueSelectionLight = 'rgba(200, 220, 240, 0.8)'
const blueSelectionDark = 'rgba(29, 55, 134, 0.8)'

const commonRules: Record<string, any> = {
  // Monospaced elements (quite a lot)
  '.cm-comment, .cm-fenced-code, .cm-inline-math, .cm-code-mark, .cm-monospace, .cm-hr, .code-block-line': {
    fontFamily: 'Inconsolata, monospace'
  },
  '.cm-gutters': {
    fontFamily: 'Inconsolata, monospace'
  },
  '.cm-tag-name, .cm-attribute-name, .cm-attribute-value, .cm-angle-bracket, .cm-definition-operator': {
    fontFamily: 'Inconsolata, monospace'
  },
  '.cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end, .mermaid-chart.error': {
    fontFamily: 'Inconsolata, monospace'
  }, // END: Monospace elements
  '.cm-quote': { fontStyle: 'italic' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    fontWeight: 'bold'
  },
  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark.cm-meta': { color: 'inherit' }
}

export const themeFrankfurtLight = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    color: 'var(--grey-5)',
    fontFamily: 'Crimson, serif'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-5)' },
  '.cm-tag-name': { color: 'var(--orange-2)' },
  '.cm-attribute-name': { color: 'var(--blue-0)' },
  '.cm-attribute-value': { color: 'var(--green-0)' },
  '.cm-angle-bracket, .cm-definition-operator': { color: 'var(--grey-5)' },
  // Primary color
  '.cm-url, .cm-link, .cm-code-mark, .cm-zkn-tag, .cm-zkn-link': { color: primaryColor },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: 'var(--grey-0)' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  '.cm-escape': { color: 'var(--grey-2)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.cm-cursor-primary': { background: primaryColor },
  '.cm-cursor-secondary': { background: 'var(--red-2)' },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: blueSelectionLight
  }
}, { dark: false })

export const themeFrankfurtDark = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    color: 'var(--grey-0)',
    fontFamily: 'Crimson, serif'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-0)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: 'var(--grey-7)' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  '.cm-cursor-primary': { background: primaryColor },
  '.cm-cursor-secondary': { background: 'var(--red-2)' },
  '.cm-tag-name': { color: 'var(--orange-2)' },
  '.cm-bracket': { color: 'var(--grey-1)' },
  '.cm-string': { color: 'var(--green-0)' },
  '.cm-attribute-name': { color: 'var(--blue-0)' },
  '.cm-attribute-value': { color: 'var(--green-0)' },
  '.cm-angle-bracket, .cm-definition-operator': { color: 'var(--grey-5)' },
  '.cm-escape': { color: 'var(--grey-4)' },
  '.cm-url, .cm-link, .cm-code-mark, .cm-zkn-tag, .cm-zkn-link': { color: primaryColor },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: blueSelectionDark
  }
}, { dark: true })
