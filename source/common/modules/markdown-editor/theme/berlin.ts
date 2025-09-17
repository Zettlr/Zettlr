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

const primaryColor = '#1cb27e'
const selectionLight = 'rgba(180, 240, 170, 0.8)'
const selectionDark = 'rgba(90, 170, 80, 0.8)'

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
  '.cm-citation-locator': { fontStyle: 'italic' },
  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark.cm-meta': { color: 'inherit' }
}

export const themeBerlinLight = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    color: 'var(--grey-5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
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
  // Citation syntax
  '.cm-citation-mark': { fontFamily: 'monospace', color: 'var(--grey-1)' },
  '.cm-citation-suppress-author-flag': { color: 'var(--red-2)' },
  '.cm-citation-at-sign': { fontFamily: 'monospace', color: 'var(--grey-1)' },
  '.cm-citation-citekey': { color: primaryColor },
  '.cm-escape': { color: 'var(--grey-2)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.cm-cursor-primary': { background: primaryColor },
  '.cm-cursor-secondary': { background: 'var(--red-2)' },
  '.cm-dropCursor': { borderLeftColor: primaryColor },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: selectionLight
  }
}, { dark: false })

export const themeBerlinDark = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    color: 'var(--grey-0)',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Avenir Next", Avenir, "Helvetica Neue", Helvetica, Ubuntu, Roboto, Noto, "Segoe UI", Arial, sans-serif'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-0)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: 'var(--grey-7)' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  // Citation syntax
  '.cm-citation-mark': { fontFamily: 'monospace', color: 'var(--grey-4)' },
  '.cm-citation-suppress-author-flag': { color: 'var(--red-2)' },
  '.cm-citation-at-sign': { fontFamily: 'monospace', color: 'var(--grey-4)' },
  '.cm-citation-citekey': { color: primaryColor },
  '.cm-cursor-primary': { background: primaryColor },
  '.cm-cursor-secondary': { background: 'var(--red-2)' },
  '.cm-dropCursor': { borderLeftColor: primaryColor },
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
    background: selectionDark
  }
}, { dark: true })
