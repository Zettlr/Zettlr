/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Utilizing the TableEditor, this renderer renders tables.
 *
 * END HEADER
 */

// DEBUG // As of now, the new TableEditor has very rudimentary functionality.
// DEBUG // It properly renders tables with basic styles in Markdown documents
// DEBUG // and allows users to click inside tables to start editing. That
// DEBUG // creation and removal of various subviews is a bit wonky right now,
// DEBUG // but any change is immediately applied to the underlying main
// DEBUG // EditorView, ensuring that no changes are retained just within the
// DEBUG // subview.

// TODOs:
// 1. Check how large the performance penalty is for converting the Markdown
//    into HTML every time we update the table's DOM. Since we already parsing
//    the AST, I guess it should not be too bad, but I'll have to run a
//    performance test.

import { type DecorationSet, EditorView } from '@codemirror/view'
import { type EditorState, StateField } from '@codemirror/state'
import { subviewUpdatePlugin } from './subview'
import { TableWidget } from './widget'

// Define a StateField that handles the entire TableEditor Schischi, as well as
// a few helper extensions that are necessary for the functioning of the widgets
export const renderTables = [
  // The actual TableEditor provider
  StateField.define<DecorationSet>({
    create (state: EditorState) {
      return TableWidget.createForState(state)
    },
    update (field, tr) {
      return TableWidget.createForState(tr.state)
    },
    provide: f => EditorView.decorations.from(f)
  }),
  // A theme for the various elements
  EditorView.baseTheme({
    '.cm-table-editor-widget': {
      borderCollapse: 'collapse',
      margin: '0 2px 0 6px', // Taken from .cm-line so that tables align
      '& td, & th': {
        color: '#3a3a3a',
        border: '1px solid #bdbdbd',
        padding: '2px 4px',
        '&:hover': { outline: '1px solid #737373' },
        '&:focus-within': { borderColor: '#1cb27e', outlineColor: '#1cb27e' }
      },
      '& tr:first-child td': { backgroundColor: '#dedede' },
      '& tr:nth-child(2n+3) td': { backgroundColor: '#f7f7f7' }
    },
    '.cm-content .cm-table-editor-widget .cm-scroller': {
      padding: '0' // Override the large margin from the main editor view
    },
    // DARK STYLES
    '&dark .cm-table-editor-widget': {
      '& td, & th': {
        color: '#d6d6d6',
        borderColor: '#4a4a4a',
        '&:hover': { outline: '1px solid #949494' }
      },
      '& tr:first-child td': { backgroundColor: '#313131' },
      '& tr:nth-child(2n+3) td': { backgroundColor: '#212121' }
    }
  }),
  subviewUpdatePlugin
]
