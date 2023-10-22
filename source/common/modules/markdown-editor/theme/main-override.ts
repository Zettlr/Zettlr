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
    backgroundColor: 'transparent'
  },
  '.cm-scroller': {
    flexGrow: '1', // Ensure the content pushes possible panels towards the edge
    outline: '0' // Remove the outline
  },
  '.cm-scroller .muted': { opacity: '0.2' },
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
  // TOOLTIPS
  '.cm-tooltip': { padding: '4px' },
  // Footnotes
  '.footnote, .footnote-ref-label': {
    verticalAlign: 'super',
    fontSize: '80%'
  }
})

export const defaultLight = EditorView.theme({}, { dark: false })
export const defaultDark = EditorView.theme({}, { dark: true })
