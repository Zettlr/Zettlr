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

const primaryColor = 'rgba(255, 180, 108, 1)'
const selectionLight = 'rgba(205, 205, 170, 1)'
const selectionDark = 'var(--grey-6)'

const commonRules: Record<string, any> = {
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    fontWeight: 'bold'
  },
  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark.cm-meta': { color: 'inherit' },
  '.cm-citation-locator': { textDecoration: 'underline' }
}

export const themeBielefeldLight = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    backgroundColor: 'var(--beige-0)',
    color: 'var(--grey-5)',
    fontFamily: '"Liberation Mono", monospace'
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
  '.cm-citation-mark': { color: 'var(--grey-1)' },
  '.cm-citation-citekey': { color: primaryColor },
  '.cm-citation-at-sign': { color: 'var(--grey-1)' },
  '.cm-citation-suppress-author-flag': { color: 'var(--red-2)' },
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

export const themeBielefeldDark = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    color: 'var(--grey-0)',
    fontFamily: '"Liberation Mono", monospace'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-0)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: 'var(--grey-7)' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  '.cm-citation-mark': { color: 'var(--grey-4)' },
  '.cm-citation-at-sign': { color: 'var(--grey-4)' },
  '.cm-citation-citekey': { color: primaryColor },
  '.cm-citation-suppress-author-flag': { color: 'var(--red-2)' },
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
