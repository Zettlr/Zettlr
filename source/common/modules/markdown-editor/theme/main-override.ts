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

export const mainOverride = EditorView.baseTheme({
  // General overrides
  '&.cm-editor': {
    height: '100%',
    fontFamily: 'inherit',
    backgroundColor: 'transparent',
    cursor: 'auto'
  },
  '&dark .cm-dropCursor': {
    borderLeftColor: '#ddd'
  },
  '.cm-scroller': {
    flexGrow: '1', // Ensure the content pushes possible panels towards the edge
    outline: '0' // Remove the outline
  },
  // Hide overflowing text in autocompletion info panels
  '.cm-completionInfo': { overflow: 'hidden' },
  // PANELS
  '.cm-panels .cm-button': {
    backgroundImage: 'none',
    backgroundColor: 'inherit',
    borderRadius: '6px',
    fontSize: '13px'
  },
  '&light .cm-panels .cm-button': {
    backgroundColor: 'white',
    borderColor: '#aaa'
  },
  '.cm-panel.cm-search label input[type=checkbox]': {
    marginRight: '10px'
  },
  '.cm-panel.cm-search': {
    userSelect: 'none' // prevent search panel text elements from being selected
  },
  '&dark .cm-panel.cm-panel-lint ul [aria-selected]': {
    // Fixes highlighting of unfocused selected lint panel items in dark mode.
    backgroundColor: '#787878'
  },
  // TOOLTIPS
  '.cm-tooltip': {
    padding: '4px',
    maxWidth: '800px'
  },
  // Footnotes
  '.footnote, .footnote-ref-label': {
    verticalAlign: 'super',
    fontSize: '80%'
  },
  '.cm-emphasis': { fontStyle: 'italic' },
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
    backgroundColor: 'var(--grey-0)'
  },
  '&dark .cm-yaml-frontmatter-start::after': {
    color: 'var(--grey-0)',
    backgroundColor: 'var(--grey-4)'
  },
  '.cm-heading': {
    textDecoration: 'none'
  },
  // Highlight/mark elements
  '.cm-highlight': {
    backgroundColor: '#ffff0080',
  },
  '&dark .cm-highlight': {
    backgroundColor: '#ffff0060',
  }
})

export const defaultLight = EditorView.theme({}, { dark: false })
export const defaultDark = EditorView.theme({}, { dark: true })
