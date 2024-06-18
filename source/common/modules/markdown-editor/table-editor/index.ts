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

// DEBUG // Addendum June 18: After an unsuccessful attempt of migrating the
// DEBUG // plugin to a ViewPlugin, the major improvement to the previous commit
// DEBUG // is that it is now a teeny-tiny bit more efficient. One thing that I
// DEBUG // changed (because I implemented this in the ViewPlugin attempt) is
// DEBUG // that now decorations are very carefully crafted in such a way that
// DEBUG // the EditorView basically only has to call toDOM once for every
// DEBUG // widget it finds in our DecorationSet, and never eq, and never
// DEBUG // updateDOM. The latter is what we definitely want to call manually
// DEBUG // during updates ourselves, however. Nevertheless, I feel like I
// DEBUG // slowly regain some command over how this all works, so in a few
// DEBUG // weeks we may have success in a basic re-implementation. One major
// DEBUG // question I have right now is definitely that I have now idea what it
// DEBUG // will do to the EditorView, if a StateField within that contains
// DEBUG // another EditorView.

// DEBUG // TODOs:
// DEBUG // 1. Properly destroy() the subview if the main view gets destroyed
// DEBUG // 2. Implement the subview management again here
// DEBUG // 3. Properly handle focusing, focus-shifts, and else to keep the
// DEBUG //    subview aligned with the proper table cell.
// DEBUG // 4. (far into the future) A way to add/remove rows/columns

// DEBUG // Current state: It properly renders a table and when the user clicks
// DEBUG // into any table cell, a subview is instantiated that properly syncs
// DEBUG // up with the main editor that basically has no idea what's going on.
// DEBUG // A few things are still wrong, however:
// DEBUG // 3. I still have to properly hide everything from the synced view
// DEBUG //    except the actual table cell contents that are being edited.

import { Decoration, DecorationSet, EditorView, WidgetType } from '@codemirror/view'
import { Range, Transaction, Annotation, EditorState, StateField } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import { SyntaxNode } from '@lezer/common'
import { parseTableNode } from "../../markdown-utils/markdown-ast/parse-table-node"
import { Table } from '../../markdown-utils/markdown-ast'

// This syncAnnotation is used to tag all transactions originating from the main
// EditorView when dispatching them to the subview to ensure they don't get re-
// emitted.
const syncAnnotation = Annotation.define<boolean>()

// This interface describes the state of the TableEditor's StateField.
interface TableEditorState {
  // This holds the TableWidgets that render legible tables
  decorations: DecorationSet
  // This holds an active subview (if applicable)
  subview: EditorView|undefined
}

// This widget holds a visual DOM representation of a table.
class TableWidget extends WidgetType {
  public hasSubview: boolean
  constructor (readonly table: string, readonly node: SyntaxNode) {
    super()
    this.hasSubview = false
    // TODO: Set up the data structure for the widget. Everytime a Decoration is
    // created a new widget will be created that holds this data. This means the
    // constructor should be extremely thin!
  }

  // This is called by CodeMirror for all widgets to see if there are
  // duplicates. This is the first of three steps to ensure all tables are
  // actually rendered. If this method returns true, CodeMirror knows the table
  // has already been rendered, and it will discard the other one. This will
  // happen quite frequently, so the `eq` method needs to also be very fast.
  eq (other: TableWidget): boolean {
    console.log('Calling `eq`')
    // NOTE: The widget should always be redrawn if the table has actually
    // changed and no active subview. In the latter case, we have to manually
    // redraw it.
    return this.table === other.table || this.hasSubview
  }

  toDOM (view: EditorView): HTMLElement {
    console.log('Calling `toDOM`')
    try {
      const table = document.createElement('table')
      // DEBUG: Move to proper styles
      table.style.borderCollapse = 'collapse'
      const ast = parseTableNode(this.node, this.table)
      updateTable(this, table, ast, view)
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
  destroy (dom: HTMLElement): void {}

  ignoreEvent (event: Event): boolean {
    return true // In this plugin case, the table should handle everything
  }
}

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
 * @param  {Table}             tableAST  An AST that contains the table
 * @param  {EditorView}        view      The EditorView
 */
function updateTable (widget: TableWidget, table: HTMLTableElement, tableAST: Table, view: EditorView): void {
  const thead = table.querySelector('thead') ?? document.createElement('thead')
  const tbody = table.querySelector('tbody') ?? document.createElement('tbody')

  // TODO: Better update mechanism that actually only updates what exactly has changed
  thead.innerHTML = ''
  tbody.innerHTML = ''

  for (const row of tableAST.rows) {
    const tr = document.createElement('tr')
    if (row.isHeaderOrFooter) {
      thead.appendChild(tr)
    } else {
      tbody.appendChild(tr)
    }

    for (const cell of row.cells) {
      const td = document.createElement(row.isHeaderOrFooter ? 'th' : 'td')
      td.textContent = view.state.sliceDoc(cell.from, cell.to)
      // DEBUG: Move to proper styles
      td.style.border = '1px solid black'
      tr.appendChild(td)
      // makeCellEditable(widget, td, view) TODO
    }
  }

  if (table.querySelector('thead') === null && thead.childNodes.length > 0) {
    table.appendChild(thead)
  }

  if (table.querySelector('tbody') === null) {
    table.appendChild(tbody)
  }
}

// Define a StateField that handles the entire TableEditor Schischi
export const renderTables = StateField.define<TableEditorState>({
  create (state: EditorState) {
    // Compute initial DecorationSet
    const newDecos: Array<Range<Decoration>> = syntaxTree(state)
      // Get all Table nodes in the document
      .topNode.getChildren('Table')
      // Turn the nodes into TableWidgets
      .map(node => {
        const table = state.sliceDoc(node.from, node.to)
        try {
          const widget = Decoration.replace({
            widget: new TableWidget(table, node.node),
            inclusive: false,
            block: true
          })

          return widget.range(node.from, node.to)
        } catch (err: any) {
          err.message = 'Could not instantiate TableEditor widget: ' + err.message
          console.error(err)
        }
      })
      // Filter out erroneous ones
      .filter((val): val is Range<Decoration> => val !== undefined)

    // Instantiate field state
    return {
      decorations: Decoration.set(newDecos),
      subview: undefined
    }
  },
  compare (a, b) {
    return a === b // TODO: Better equality check (see below, update method)
  },
  update (field, tr) {
    // First, update the subview, if applicable
    if (field.subview !== undefined) {
      // NOTE: This may never trigger an update on the main view, so ensure
      // this annotates the transactions and that the subview knows not to
      // re-emit these updates back to the main view.
      maybeUpdateSubview(field.subview, tr)
    }

    // Second, ensure the range values are correct for the new document state.
    field.decorations = field.decorations.map(tr.changes)

    // Third, we have to compare the Table nodes that are actually present
    // in the now-current document to the ones that we have rendered.
    // Extracting the table nodes is quite simple:
    const tableNodes = syntaxTree(tr.state).topNode.getChildren('Table')

    // Extracting the rendered ranges, however, is oddly difficult. There is
    // no proper array-style map function, so we'll have to use `between`.
    const renderedRanges: Array<{ from: number, to: number }> = []
    field.decorations.between(0, tr.state.doc.length, (from, to, value) => {
      // TODO: Here might be a good place to call updateDom for all those
      // widgets! But this could also just throw a bunch of errors, who knows?
      renderedRanges.push({ from, to })
    })

    // Now we have the actually existing nodes and the ranges that we have
    // thus far decorated, which is the information we need to determine
    // which tables are new and thus need to be rendered.

    const newDecos: Array<Range<Decoration>> = []

    for (const node of tableNodes) {
      const isNew = renderedRanges.find(r => node.from === r.from && node.to === r.to) === undefined

      if (!isNew) {
        continue
      }

      const table = tr.state.sliceDoc(node.from, node.to)
      try {
        const widget = Decoration.replace({
          widget: new TableWidget(table, node.node), // TODO: Do I even need the node? No, right?
          inclusive: false,
          block: true
        })

        newDecos.push(widget.range(node.from, node.to))
      } catch (err: any) {
        err.message = 'Could not instantiate TableEditor widget: ' + err.message
        console.error(err)
      }
    }

    // Finally, add or remove decorations to/from the set so that the next
    // time CodeMirror calls the decorations() method below, it will receive
    // the proper DOM elements for the tables.
    field.decorations = field.decorations.update({
      // Add the new ranges
      add: newDecos,
      // TODO: Set to true if this plugin throws errors; I'm currently
      // assuming that the SyntaxTree's getChildren() method returns me the
      // nodes in sorted order
      sort: undefined,
      // Remove any decoration range whose corresponding table is no longer
      // in the document
      filter (from, to, value) {
        return tableNodes.find(val => val.from === from && val.to === to) !== undefined
      }
    })

    // DEBUG: We are returning a different value every time so that the ===-
    // equality check returns false. However, this is obviously bad and we
    // should always return the same field and then instead implement a better
    // comparator.
    return { ...field }
  },
  // NOTE: Since we store additional data in our StateField, we must use an
  // overload of the Facet's `from` method that allows us to return just a part
  // of the field whenever the Facet is recomputed.
  provide: f => EditorView.decorations.from(f, value => value.decorations)
})
