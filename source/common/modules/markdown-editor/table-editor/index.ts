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

import { DecorationSet, EditorView } from '@codemirror/view'
import { EditorState, StateField } from '@codemirror/state'
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
      // DEBUG We also need to recompute when the selection changed, check if we
      // could also explicitly check for the selection and update only when
      // necessary
      // return tr.docChanged ? TableWidget.createForState(tr.state) : field
      return TableWidget.createForState(tr.state)
    },
    provide: f => EditorView.decorations.from(f)
  }),
  // A theme for the various elements
  EditorView.baseTheme({
    '.cm-content .cm-table-editor-widget': {
      borderCollapse: 'collapse',
      margin: '0 2px 0 6px' // Taken from .cm-line so that tables align
    },
    '.cm-content .cm-table-editor-widget .cm-scroller': {
      padding: '0' // Override the large margin from the main editor view
    },
    '.cm-content .cm-table-editor-widget td, .cm-content .cm-table-editor-widget th': {
      border: '1px solid black',
      padding: '2px 4px'
    },
    '&dark .cm-content .cm-table-editor-widget td, &dark .cm-content .cm-table-editor-widget th': {
      borderColor: '#aaaaaa'
    }
  }),
  subviewUpdatePlugin
]
