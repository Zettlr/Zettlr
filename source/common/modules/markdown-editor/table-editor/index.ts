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

// DEBUG // Current state: It properly renders a table and when the user clicks
// DEBUG // into any table cell, a subview is instantiated that properly syncs
// DEBUG // up with the main editor that basically has no idea what's going on.
// DEBUG // A few things are still wrong, however:
// DEBUG // 1. The table decoration drawer should really check whether a table
// DEBUG //    currently has an active subview, because if so, redrawing will
// DEBUG //    basically remove the subview again.
// DEBUG // 2. There is an equality check between two table widgets that needs
// DEBUG //    to return true only if the widget is impossible to be rerendered.
// DEBUG //    If it returns true if something has changed, it will again remove
// DEBUG //    the DOM element. Generally speaking, we should keep a single
// DEBUG //    table widget for as long as the specified table is in the document
// DEBUG //    but for that we must properly keep track of the changing range in
// DEBUG //    which that table is.
// DEBUG // 3. I still have to properly hide everything from the synced view
// DEBUG //    except the actual table cell contents that are being edited.

import { Decoration, DecorationSet, EditorView } from '@codemirror/view'
import { EditorState, StateField, Range } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { rangeInSelection } from '../util/range-in-selection'
import { TableWidget, maybeUpdateSubview } from './widget'

////////////////////////////////////////////////////////////////////////////////
// SECTION ONE: RENDERING A TABLE
////////////////////////////////////////////////////////////////////////////////

function renderTableWidgets (state: EditorState): DecorationSet {
  const widgets: Array<Range<Decoration>> = []

  syntaxTree(state).iterate({
    from: 0,
    to: state.doc.length,
    enter: (node) => {
      if (rangeInSelection(state, node.from, node.to) || node.type.name !== 'Table') {
        return
      }

      const table = state.sliceDoc(node.from, node.to)
      try {
        const widget = Decoration.replace({
          // NOTE: Even though we create a new table widget even if the table
          // hasn't changed, CodeMirror will call the `eq` method to ensure we
          // only have one widget per actual table. So CodeMirror will ensure
          // for us that we exclusively have one TableWidget per actual table in
          // the document.
          widget: new TableWidget(table, node.node),
          inclusive: false,
          block: true
        })

        widgets.push(widget.range(node.from, node.to))
      } catch (err: any) {
        err.message = 'Could not instantiate TableEditor widget: ' + err.message
        console.error(err)
      }
    }
  })

  return Decoration.set(widgets)
}

////////////////////////////////////////////////////////////////////////////////
// SECTION TWO: MAKING A TABLE CELL EDITABLE
////////////////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////////////////
// SECTION THREE: EXPOSING FUNCTIONALITY TO THE OUTSIDE
////////////////////////////////////////////////////////////////////////////////

export const renderTables = StateField.define<DecorationSet>({
  create (state: EditorState) {
    return renderTableWidgets(state)
  },
  update (oldDecoSet, tr) {
    console.log('Before DecoSet Map')
    oldDecoSet.map(tr.changes)
    console.log('After DecoSet Map')
    maybeUpdateSubview(tr)
    return renderTableWidgets(tr.state)
  },
  provide: f => EditorView.decorations.from(f)
})

