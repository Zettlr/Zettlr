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
// DEBUG // What works is we only have a single source of truth -- the main
// DEBUG // editor. Changes written to individual table cells are persisted
// DEBUG // directly. However, there is still some wonkyness in how the editor
// DEBUG // works, but in general it is beginning to work. Slowly, but steadily.

import { Decoration, DecorationSet, EditorView, WidgetType, drawSelection, keymap } from '@codemirror/view'
import { Range, Transaction, Annotation, EditorState, StateField } from '@codemirror/state'
import { defaultHighlightStyle, syntaxHighlighting, syntaxTree } from '@codemirror/language'
import { SyntaxNode } from '@lezer/common'
import { parseTableNode } from "../../markdown-utils/markdown-ast/parse-table-node"
import { TableRow } from '../../markdown-utils/markdown-ast'
import { nodeToHTML } from '../../markdown-utils/markdown-to-html'
import { defaultKeymap } from '@codemirror/commands'

// This syncAnnotation is used to tag all transactions originating from the main
// EditorView when dispatching them to the subview to ensure they don't get re-
// emitted.
const syncAnnotation = Annotation.define<boolean>()

// This widget holds a visual DOM representation of a table.
class TableWidget extends WidgetType {
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    // console.log('Calling `updateDOM`')
    // This check allows us to, e.g., create error divs (instead of Table elements)
    if (!(dom instanceof HTMLTableElement)) {
      return false
    }
    updateTable(this, dom, view)
    return true
  }

  toDOM (view: EditorView): HTMLElement {
    // console.log('Calling `toDOM`')
    try {
      const table = document.createElement('table')
      // DEBUG: Move to proper styles
      table.style.borderCollapse = 'collapse'
      updateTable(this, table, view)
      return table
    } catch (err: any) {
      console.log('Could not create table', err)
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      // error.addEventListener('click', () => clickAndSelect(view))
      return error
    }
  }

  // TODO: Any additional cleanup necessary we should do here.
  destroy (dom: HTMLElement): void {
    // This function will be called automatically whenever the main view or this
    // widget gets destroyed
  }

  ignoreEvent (event: Event): boolean {
    return true // In this plugin case, the table should handle everything
  }
}

// DEBUG: Maybe we won't need that at all...? At least I can actually write
// properly into the table cells. But this is a problem for future me.
/**
 * This function takes an EditorView that is acting as a slave to some main
 * EditorView in which the TableEditor is running and applies all provided
 * transactions one by one to the subview, ensuring to tag the transactions with
 * a syncAnnotation to signal to the subview that it should not re-emit those
 * transactions.
 *
 * @param  {EditorView}   subview  The subview to have the transaction applied to
 * @param  {Transaction}  tr       The transaction from the main view
 */
function maybeUpdateSubview (subview: EditorView, tr: Transaction): void {
  if (!tr.changes.empty && tr.annotation(syncAnnotation) === undefined) {
    const annotations: Annotation<any>[] = [syncAnnotation.of(true)]
    const userEvent = tr.annotation(Transaction.userEvent)
    if (userEvent !== undefined) {
      annotations.push(Transaction.userEvent.of(userEvent))
    }
    subview.dispatch({changes: tr.changes, annotations})
  }
}

/**
 * This function takes a DOM-node and a string representing the same Markdown
 * table and ensures that the DOM-node representation conforms to the string.
 *
 * @param  {TableWidget}       widget    A TableWidget
 * @param  {HTMLTableElement}  table     The DOM-element containing the table
 * @param  {EditorState}       state     The EditorState
 */
function updateTable (widget: TableWidget, table: HTMLTableElement, view: EditorView): void {
  const tableAST = parseTableNode(widget.node, view.state.sliceDoc())

  let trs = Array.from(table.querySelectorAll('tr'))

  if (trs.length > tableAST.rows.length) {
    // Too many TRs --> Remove. The for-loop below accounts for too few.
    for (let j = tableAST.rows.length; j < trs.length; j++) {
      trs[j].parentElement?.removeChild(trs[j])
    }
    trs = trs.slice(0, tableAST.rows.length)
  }

  for (let i = 0; i < tableAST.rows.length; i++) {
    const row = tableAST.rows[i]
    if (i === trs.length) {
      // We have to create a new TR
      const tr = document.createElement('tr')
      table.appendChild(tr)
      trs.push(tr)
      updateRow(tr, row, view)
    } else {
      // Transfer the contents
      updateRow(trs[i], row, view)
    }
  }
}

function updateRow (tr: HTMLTableRowElement, astRow: TableRow, view: EditorView): void {
  let tds = Array.from(tr.querySelectorAll(astRow.isHeaderOrFooter ? 'th' : 'td'))
  if (tds.length > astRow.cells.length) {
    // Too many TDs --> Remove. The for-loop below accounts for too few.
    for (let j = astRow.cells.length; j < tds.length; j++) {
      tds[j].parentElement?.removeChild(tds[j])
    }
    tds = tds.slice(0, astRow.cells.length)
  }

  const mainSelection = view.state.selection.main

  for (let i = 0; i < astRow.cells.length; i++) {
    const cell = astRow.cells[i]
    // NOTE: This only is true for a selection that is completely contained
    // within a cell. Any overlapping selection will not cause a rendering of
    // the editor view, because selections that cross table cell boundaries are
    // just ... puh.
    const selectionInCell =  mainSelection.from >= cell.from && mainSelection.to <= cell.to
    if (i === tds.length) {
      // We have to create a new TD
      const td = document.createElement(astRow.isHeaderOrFooter ? 'th' : 'td')
      // DEBUG: Move to proper styles
      td.style.border = '1px solid black'
      td.style.padding = '2px'
      td.innerHTML = nodeToHTML(cell.children, (citations, composite) => undefined, 0)
      const handler = () => {
        console.log(`Click! Setting selection: ${cell.from}:${cell.to}`)
        view.dispatch({ selection: { anchor: cell.from, head: cell.from } })
        td.removeEventListener('click', handler)
      }
      td.addEventListener('click', handler)
      tr.appendChild(td)
      tds.push(td)
    } else {
      const subview = EditorView.findFromDOM(tds[i])
      if (subview !== null && !selectionInCell) {
        // The selection was in the cell but isn't any longer -> remove the
        // subview.
        subview.dom.parentElement?.removeChild(subview.dom)
        subview.destroy()
      } else if (subview === null && selectionInCell) {
        console.log('Selection is in cell, creating subview...')
        // Create a new subview to represent the selection here
        const state = EditorState.create({
          // TODO: Find the substring this cell contains in the original view
          doc: view.state.sliceDoc(), // subview holds the entirety of the doc BUT hides whatever we don't need
          extensions: [
            keymap.of(defaultKeymap),
            drawSelection(),
            syntaxHighlighting(defaultHighlightStyle)
          ]
        })
    
        const subview = new EditorView({
          state,
          parent: tds[i],
          // Route any updates to the main view
          dispatch: (tr, subview) => {
            // TODO: Find a way to update the table based on the updates in the subview
            subview.update([tr])
            if (!tr.changes.empty && tr.annotation(syncAnnotation) === undefined) {
              const annotations: Annotation<any>[] = [syncAnnotation.of(true)]
              const userEvent = tr.annotation(Transaction.userEvent)
              if (userEvent !== undefined) {
                annotations.push(Transaction.userEvent.of(userEvent))
              }
              view.dispatch({ changes: tr.changes, annotations })
            }
          }
        })
      } else if (subview === null) {
        // Simply transfer the contents
        tds[i].innerHTML = nodeToHTML(cell.children, (citations, composite) => undefined, 0)
      } // Else: There is a subview in there, and the selection is also here, so don't do anything
    }
  }
}

function createTableEditorWidgets (state: EditorState): DecorationSet {
  const newDecos: Array<Range<Decoration>> = syntaxTree(state)
    // Get all Table nodes in the document
    .topNode.getChildren('Table')
    // Turn the nodes into Decorations
    .map(node => {
      try {
        return Decoration.replace({
          widget: new TableWidget(state.sliceDoc(node.from, node.to), node.node),
          // inclusive: false,
          block: true
        }).range(node.from, node.to)
      } catch (err: any) {
        err.message = 'Could not instantiate TableEditor widget: ' + err.message
        console.error(err)
      }
    })
    // Filter out erroneous ones
    .filter((val): val is Range<Decoration> => val !== undefined)
  return Decoration.set(newDecos)
}

// Define a StateField that handles the entire TableEditor Schischi
export const renderTables = StateField.define<DecorationSet>({
  create (state: EditorState) {
    return createTableEditorWidgets(state)
  },
  update (field, tr) {
    return tr.docChanged ? createTableEditorWidgets(tr.state) : field
  },
  provide: f => EditorView.decorations.from(f)
})
