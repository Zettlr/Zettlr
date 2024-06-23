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

import { Decoration, DecorationSet, EditorView, ViewPlugin, ViewUpdate, WidgetType, drawSelection, keymap } from '@codemirror/view'
import { Range, Transaction, Annotation, EditorState, StateField, Prec } from '@codemirror/state'
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

  toDOM (view: EditorView): HTMLElement {
    try {
      const table = document.createElement('table')
      table.classList.add('cm-table-editor-widget')
      updateTable(this, table, view)
      return table
    } catch (err: any) {
      console.log('Could not create table', err)
      const error = document.createElement('div')
      error.classList.add('error')
      error.textContent = `Could not render table: ${err.message}`
      return error
    }
  }

  updateDOM (dom: HTMLElement, view: EditorView): boolean {
    // This check allows us to, e.g., create error divs
    if (!(dom instanceof HTMLTableElement)) {
      return false
    }
    updateTable(this, dom, view)
    return true
  }

  destroy (dom: HTMLElement): void {
    // Here we ensure that we completely detach any active subview from the rest
    // of the document so that the garbage collector can remove the subview.
    const cells = [
      ...dom.querySelectorAll('td'),
      ...dom.querySelectorAll('th')
    ]

    for (const cell of cells) {
      const subview = EditorView.findFromDOM(cell)
      if (subview !== null) {
        subview.destroy()
      }
    }
  }

  ignoreEvent (event: Event): boolean {
    return true // In this plugin case, the table should handle everything
  }

  /**
   * Takes an EditorState and returns a DecorationSet containing TableWidgets
   * for each Table node found in the state.
   *
   * @param   {EditorState}    state  The EditorState
   *
   * @return  {DecorationSet}         The DecorationSet
   */
  public static createForState (state: EditorState): DecorationSet {
    const newDecos: Array<Range<Decoration>> = syntaxTree(state)
      // Get all Table nodes in the document
      .topNode.getChildren('Table')
      // Turn the nodes into Decorations
      .map(node => {
        return Decoration.replace({
          widget: new TableWidget(state.sliceDoc(node.from, node.to), node.node),
          // inclusive: false,
          block: true
        }).range(node.from, node.to)
      })
    return Decoration.set(newDecos)
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
 * @param  {TableWidget}       widget  A TableWidget
 * @param  {HTMLTableElement}  table   The DOM-element containing the table
 * @param  {EditorView}        view    The EditorView
 */
function updateTable (widget: TableWidget, table: HTMLTableElement, view: EditorView): void {
  const tableAST = parseTableNode(widget.node, view.state.sliceDoc())

  let trs = [...table.querySelectorAll('tr')]
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

/**
 * This function takes a single table row to update it. This is basically the
 * second level of recursion for those tree structures, but since it is
 * noticeably different from the first level function above, and also the last
 * layer of recursion here, we use a second function for that.
 *
 * @param  {HTMLTableRowElement}  tr      The table row element
 * @param  {TableRow}             astRow  The AST table row element
 * @param  {EditorView}           view    The EditorView
 */
function updateRow (tr: HTMLTableRowElement, astRow: TableRow, view: EditorView): void {
  let tds = [...tr.querySelectorAll(astRow.isHeaderOrFooter ? 'th' : 'td')]
  if (tds.length > astRow.cells.length) {
    // Too many TDs --> Remove. The for-loop below accounts for too few.
    for (let j = astRow.cells.length; j < tds.length; j++) {
      tds[j].parentElement?.removeChild(tds[j])
    }
    tds = tds.slice(0, astRow.cells.length)
  }

  const mainSel = view.state.selection.main

  for (let i = 0; i < astRow.cells.length; i++) {
    const cell = astRow.cells[i]
    // NOTE: This only is true for a selection that is completely contained
    // within a cell. Any overlapping selection will not cause a rendering of
    // the editor view, because selections that cross table cell boundaries are
    // just ... puh.
    const selectionInCell =  mainSel.from >= cell.from && mainSel.to <= cell.to
    if (i === tds.length) {
      // We have to create a new TD
      const td = document.createElement(astRow.isHeaderOrFooter ? 'th' : 'td')
      // TODO: Enable citation rendering here
      td.innerHTML = nodeToHTML(cell.children, (citations, composite) => undefined, 0).trim()
      // NOTE: This handler gets attached once and then remains on the TD for
      // the existence of the table. Since the `view` will always be the same,
      // we only have to save the cellFrom and cellTo to the TDs dataset each
      // time around (see below).
      td.addEventListener('click', (e) => {
        e.preventDefault()
        e.stopPropagation()
        const from = td.dataset.cellFrom ?? '0'
        const to = td.dataset.cellTo ?? '0'
        // TODO: Find a more appropriate position for the cursor
        view.dispatch({
          selection: { anchor: parseInt(from, 10), head: parseInt(to, 10) }
        })
      })
      tr.appendChild(td)
      tds.push(td)
    }

    // Always ensure that the corresponding document offsets are saved
    // appropriately
    tds[i].dataset.cellFrom = String(cell.from)
    tds[i].dataset.cellTo = String(cell.to)

    // At this point, there is guaranteed to be an element at i. Now let's check
    // if there's a subview at this cell.
    const subview = EditorView.findFromDOM(tds[i])
    if (subview !== null && !selectionInCell) {
      console.log('Removing subview from table cell')
      // The selection was in the cell but isn't any longer -> remove the
      // subview.
      subview.destroy()
    } else if (subview === null && selectionInCell) {
      // Create a new subview to represent the selection here
      // Ensure the cell itself is empty before we mount the subview.
      console.log('Creating subview in table cell')
      tds[i].innerHTML = ''
      createSubviewForCell(view, tds[i], { from: cell.from, to: cell.to })
    } else if (subview === null) {
      // Simply transfer the contents
      // TODO: Enable citation rendering here
      tds[i].innerHTML = nodeToHTML(cell.children, (citations, composite) => undefined, 0).trim()
    } // Else: The cell has a subview and the selection is still in there.
  }
}

/**
 * Creates and mounts a sub-EditorView within the provided targetCell.
 *
 * @param  {EditorView}            mainView    The main view
 * @param  {HTMLTableCellElement}  targetCell  The cell element
 */
function createSubviewForCell (mainView: EditorView, targetCell: HTMLTableCellElement, cellRange: { from: number, to: number }): void {
  // TODO: Listen to main view updates and apply them as they come in.
  const state = EditorState.create({
    // Subviews always hold the entire document. This is to make synchronizing
    // updates between main and subviews faster and simpler. This should only
    // become a problem on very old computers for people working with 100MB
    // documents. This assumes that this would be an edge case. Note to future
    // me: "You knew there was going to be this guy who now keeps peskering
    // because he can't edit his ten-million line JSON files without waiting
    // three seconds for the changes to be applied to his overweight text file."
    doc: mainView.state.sliceDoc(),
    extensions: [
      // A minimal set of extensions
      keymap.of(defaultKeymap),
      Prec.high(keymap.of([
        // Disable a few shortcuts, preventing programmatic insertion of newlines
        { key: 'Return', run: (view) => true },
        { key: 'Ctrl-Return', run: (view) => true },
        { key: 'Cmd-Return', run: (view) => true },
      ])),
      drawSelection(),
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      // A field whose sole purpose is to hide the two stretches of content
      // before and after the table cell contents
      StateField.define<DecorationSet>({
        create (state) {
          const { from, to } = mainView.state.doc.lineAt(cellRange.from)
          return Decoration.set([
            // 1: Block before
            Decoration.replace({ block: true, inclusive: true })
              .range(0, from - 1),
            // 2: Line until cellRange.from
            Decoration.replace({ block: false, inclusive: false })
              .range(from, cellRange.from),
            // 3: Line after cellRange.to
            Decoration.replace({ block: false, inclusive: false })
              .range(cellRange.to, to),
            // 4: Block after
            Decoration.replace({ block: true, inclusive: true })
              .range(to + 1, mainView.state.doc.length)
          ])
        },
        update (value, tr) {
          // Ensure the range always stays the same
          return value.map(tr.changes)
        },
        provide: f => EditorView.decorations.from(f)
      }),
      // A transaction filter that disallows insertion of linebreaks
      EditorState.transactionFilter.of((tr) => {
        // TODO: Works pretty well, BUT I have to check for whether the cursor
        // is at the end of the cell, because when the user wants to insert text
        // there is new text added, and this also means the selection will
        // strictly speaking end up after the cell which in this particular case
        // is fine.
        const cellFrom = parseInt(targetCell.dataset.cellFrom ?? '0', 10)
        const cellTo = parseInt(targetCell.dataset.cellTo ?? '0', 10)
        // Sanity check
        if (cellFrom !== cellTo && cellTo > 0) {
          console.log(`Cell range ${cellFrom}:${cellTo}`)
          for (const { from, to } of tr.newSelection.ranges) {
            if (from < cellFrom || to > cellTo) {
              return [] // Disallow this transaction
            }
          }
        }

        if (!tr.docChanged) {
          return tr
        }

        let hasNewline = false
        tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
          if (hasNewline || inserted.sliceString(0).includes('\n')) {
            hasNewline = true
          }
        })

        if (hasNewline) {
          return [] // Disallow this transaction
        }

        return tr
      })
    ]
  })

  const subview = new EditorView({
    state,
    parent: targetCell,
    selection: { anchor: cellRange.from, head: cellRange.from },
    // Route any updates to the main view
    dispatch: (tr, subview) => {
      // TODO: Find a way to update the subview as soon as the main view
      // gets updated.
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

  subview.focus()
}

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
  // A view plugin that passes any transaction from the main view into the
  // various subviews.
  ViewPlugin.define(view => ({
    update (u: ViewUpdate) {
      const cells = [
        ...view.dom.querySelectorAll('.cm-table-editor-widget td'),
        ...view.dom.querySelectorAll('.cm-table-editor-widget th')
      ] as HTMLTableCellElement[]

      for (const cell of cells) {
        const subview = EditorView.findFromDOM(cell)
        if (subview !== null) {
          for (const tr of u.transactions) {
            maybeUpdateSubview(subview, tr)
          }
        }
      }
    }
  }))
]
