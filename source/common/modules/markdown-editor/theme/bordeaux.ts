/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Bordeaux Theme
 * CVM-Role:        BaseTheme
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the Bordeaux theme styles
 *
 * END HEADER
 */
import { EditorView } from '@codemirror/view'

const primaryColor = '#1bd4e9'
const selectionLight = '#b8f0f6cc'
const selectionDark = '#0c616acc'

const commonRules: Record<string, any> = {
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    fontWeight: 'bold'
  },
  // For more diversity, don't color the link marks
  '.cm-link.cm-code-mark.cm-meta': { color: 'inherit' },
  '.cm-citation-locator': { textDecoration: 'underline' }
}

export const themeBordeauxLight = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    backgroundColor: '#fffff8',
    color: 'var(--grey-5)',
    fontFamily: 'Inconsolata, monospace'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-5)' },
  '.cm-tag-name': { color: 'var(--orange-2)' },
  '.cm-attribute-name': { color: 'var(--blue-0)' },
  '.cm-attribute-value': { color: 'var(--green-0)' },
  '.cm-angle-bracket, .cm-definition-operator': { color: 'var(--grey-5)' },
  // Primary color
  '.cm-code-mark:not(.cm-emphasis, .cm-strong, .cm-list), .cm-zkn-tag': { color: primaryColor },
  '.cm-url, .cm-link, .cm-zkn-link': { textDecoration: 'underline' },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: 'var(--grey-0)' },
  '.citeproc-citation': {
    backgroundColor: 'inherit',
    color: '#d02325'
  },
  '.cm-citation': { color: '#d02325' },
  '.cm-citation-mark': { color: 'var(--grey-1)' },
  '.cm-citation-at-sign': { color: 'var(--grey-1)' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  '.cm-escape': { color: 'var(--grey-2)' },
  '.cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.cm-cursor-primary': { background: primaryColor },
  '.cm-cursor-secondary': { background: 'var(--red-2)' },
  '.cm-dropCursor': { borderLeftColor: primaryColor },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: selectionLight
  },
  '.cm-quote': { color: '#555' }
}, { dark: false })

export const themeBordeauxDark = EditorView.theme({
  ...commonRules,
  '.cm-scroller': {
    backgroundColor: '#002b36',
    color: '#839496',
    // color: 'var(--grey-0)',
    fontFamily: 'Inconsolata, monospace'
  },
  '.cm-comment, .cm-fenced-code, .cm-inline-math': { color: 'var(--grey-0)' },
  '.cm-hr, .cm-yaml-frontmatter-start, .cm-yaml-frontmatter-end': {
    color: primaryColor
  },
  '.citeproc-citation, .code-block-line-background, .inline-code-background': { backgroundColor: '#002024' },
  '.citeproc-citation.error, .mermaid-chart.error': { color: 'var(--red-2)' },
  '.cm-citation': { backgroundColor: '#002024' },
  '.cm-citation-mark': { color: 'var(--grey-4)' },
  '.cm-citation-at-sign': { color: 'var(--grey-4)' },
  '.cm-citation-citekey': { color: '#d02325' },
  '.cm-citation-suppress-author-flag': { color: '#d02325' },
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
  '.cm-code-mark:not(.cm-emphasis, .cm-strong, .cm-list), .cm-zkn-tag': { color: primaryColor },
  '.cm-url, .cm-link, .cm-zkn-link': { textDecoration: 'underline' },
  // Copied with my blood from the DOM; the example on the website is wrong.
  '&.cm-focused .cm-scroller .cm-layer.cm-selectionLayer .cm-selectionBackground, ::selection': {
    background: selectionDark
  },
  '.cm-highlight': {
    color: 'black !important',
  },
  '.cm-quote, .cm-link, .cm-strong, .cm-emphasis': { color: '#93a1a1' }
}, { dark: true })
