import { EditorView, WidgetType, drawSelection, keymap } from "@codemirror/view"
import { SyntaxNode } from "@lezer/common"
import { parseTableNode } from "../../markdown-utils/markdown-ast/parse-table-node"
import { Table } from "../../markdown-utils/markdown-ast"
import { defaultKeymap } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { Annotation, EditorState, Transaction, RangeValue } from "@codemirror/state"

export class TableWidget extends WidgetType {
  public hasSubview: boolean
  // What determines if a table is still the same one? Well, basically just if
  // the table's text is the same one, and it's at the same position in the
  // document. Here, we pass the actual table contents and a SyntaxNodeRef to
  // the widget. NOTE: We provide a SyntaxNodeRef, since its from and to
  // properties will always update in case the node moves (because text is
  // inserted somewhere between the document start and node.from). This ensures
  // that there is no update required when a table simply moves.
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
    // NOTE: The widget should always be redrawn if the table has actually
    // changed and no active subview. In the latter case, we have to manually
    // redraw it.
    return this.table === other.table || this.hasSubview
  }

  // If `eq` returns false, this is a first indication that the widget may need
  // to be redrawn. However, creating new DOM nodes can be very expensive, so
  // before that, it will call the `updateDOM` method for an already existing
  // DOM node. (Basically, cloning DOM nodes and then updating them is faster
  // than creating them.) If an update is successful, CodeMirror stops here.
  // However, if a table could not be updated (i.e., because the Table is now
  // borked), we turn to the third and final step: `toDOM`.
  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    console.log('Calling `updateDOM`')
    if (!(dom instanceof HTMLTableElement)) {
      return false // Must be an HTMLTableElement
    }

    console.log('Attempting DOM update')
    try {
      const ast = parseTableNode(this.node, view.state.sliceDoc(this.node.from, this.node.to))
      // DEBUG: Once I have a proper update mechanism that takes into account that
      // the table could have an active subview, uncomment again!
      updateTable(this, dom as HTMLTableElement, ast, view)
      return true
    } catch (err: any) {
      console.error('Could not update DOM', err)
      return false
    }
  }

  // This is the final method CodeMirror will go through to end up having a DOM
  // node that can be inserted into the editor. If we have a Widget that (a) is
  // not equal to any already existing, and (b) that could not create a table
  // based off an already existing DOM node, then it must create its very own,
  // new DOM node. Because of the way we implement the `updateDOM` method, this
  // should realistically only happen if (a) we're dealing with the very first
  // table, or (b) something happened to an existing table that suddenly makes
  // it an invalid table. In that case, this method will generate an error DIV
  // that can be checked above.
  toDOM (view: EditorView): HTMLElement {
    console.log('Calling `toDOM`')
    try {
      const table = document.createElement('table')
      // DEBUG: Move to proper styles
      table.style.borderCollapse = 'collapse'
      const ast = parseTableNode(this.node, view.state.sliceDoc(this.node.from, this.node.to))
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
      makeCellEditable(widget, td, view)
    }
  }

  if (table.querySelector('thead') === null && thead.childNodes.length > 0) {
    table.appendChild(thead)
  }

  if (table.querySelector('tbody') === null) {
    table.appendChild(tbody)
  }
}

let subview: EditorView|undefined = undefined
export const syncAnnotation = Annotation.define<boolean>()

function makeCellEditable (widget: TableWidget, td: HTMLTableCellElement, mainView: EditorView): void {
  const cb = (event: MouseEvent) => {
    if (td.textContent === null) {
      return
    }
    td.textContent = '' // Empty out the cell
    const state = EditorState.create({
      // TODO: Find the substring this cell contains in the original view
      doc: mainView.state.doc, // subview holds the entirety of the doc BUT hides whatever we don't need
      extensions: [
        keymap.of(defaultKeymap),
        drawSelection(),
        syntaxHighlighting(defaultHighlightStyle)
      ]
    })
    if (subview !== undefined) {
      subview.destroy()
      subview = undefined
    }

    subview = new EditorView({
      state,
      parent: td,
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
          mainView.dispatch({ changes: tr.changes, annotations })
        }
      }
    })

    widget.hasSubview = true
    // TODO: Set hasSubview to false again should that change!

    // TODO: Apply all changes NOT here, but to the ORIGINAL view. Then, make
    // sure that any changes to the original view are applied here automagically
    // (including those that don't pertain to this partial view so that everything
    // is in sync).

    // Remove callback again
    td.removeEventListener('click', cb)
  }
  // Register a callback that will mount a CM editor onto the table cell
  td.addEventListener('click', cb)
}

export function maybeUpdateSubview (tr: Transaction): void {
  if (subview !== undefined && !tr.changes.empty && tr.annotation(syncAnnotation) === undefined) {
    const annotations: Annotation<any>[] = [syncAnnotation.of(true)]
    const userEvent = tr.annotation(Transaction.userEvent)
    if (userEvent !== undefined) {
      annotations.push(Transaction.userEvent.of(userEvent))
    }
    subview.dispatch({changes: tr.changes, annotations})
  }
}
