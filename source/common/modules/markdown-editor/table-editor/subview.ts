/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TableEditor Subview methods
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a set of methods that are used to 
 *                  create and manage subviews within table editor widgets.
 *
 * END HEADER
 */

import { defaultKeymap } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { EditorState, Prec, StateField, Annotation, Transaction, Extension } from "@codemirror/state"
import { EditorView, keymap, drawSelection, DecorationSet, Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view"

/**
 * This syncAnnotation is used to tag all transactions originating from the main
 * EditorView when dispatching them to the subview to ensure they don't get
 * re-emitted.
 */
const syncAnnotation = Annotation.define<boolean>()

/**
 * A transaction filter that ensures that, e.g., selections can never leave the
 * visible stretch of the table cell, and that no newlines get inserted.
 *
 * @param   {HTMLTableCellElement}  targetCell  The table cell
 *
 * @return  {Extension}                         The view extension
 */
function ensureBoundariesPlugin (targetCell: HTMLTableCellElement): Extension {
  return EditorState.transactionFilter.of((tr) => {
    // TODO: Works okay-ish for now, but I have to implement many more checks to
    // ensure that most use-cases will end up having better rendering. Also,
    // apparently the transaction will still end up being forwarded to the main
    // view, which means that the selections can get out of sync: Whereas a
    // cursor in here will be still at the same position, the cursor in the main
    // view will be out of the cell, and any additional changes can end up
    // there. That's no good!
    const cellFrom = parseInt(targetCell.dataset.cellFrom ?? '0', 10)
    const cellTo = parseInt(targetCell.dataset.cellTo ?? '0', 10)
    // Sanity check
    if (tr.selection !== undefined && tr.changes.length === 0 && cellFrom !== cellTo && cellTo > 0) {
      const { from, to } = tr.selection.main
      if (from < cellFrom || to > cellTo) {
        return [] // Disallow this transaction
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
}

/**
 * A field whose sole purpose is to hide the two stretches of content before and
 * after the table cell contents.
 *
 * @param   {EditorView}                    mainView   The mainView
 * @param   {{ from: number, to: number }}  cellRange  The cell range (from/to)
 *
 * @return  {Extension}                                The extension for the view
 */
function hideBeforeAndAfterCell (mainView: EditorView, cellRange: { from: number, to: number }): Extension {
  return StateField.define<DecorationSet>({
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
  })
}

/**
* Creates and mounts a sub-EditorView within the provided targetCell.
*
* @param  {EditorView}            mainView    The main view
* @param  {HTMLTableCellElement}  targetCell  The cell element
*/
export function createSubviewForCell (
  mainView: EditorView,
  targetCell: HTMLTableCellElement,
  cellRange: { from: number, to: number }
): void {
  const state = EditorState.create({
    // Subviews always hold the entire document. This is to make synchronizing
    // updates between main and subviews faster and simpler. This should only
    // become a problem on very old computers for people working with 100MB
    // documents. This assumes that this would be an edge case. Note to future
    // me: "You knew there was going to be this guy who now keeps peskering me
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
      // Two custom extensions that are required for the specific use-case of
      // this single-line minimal EditorView
      hideBeforeAndAfterCell(mainView, cellRange),
      ensureBoundariesPlugin(targetCell)
    ]
  })

  const subview = new EditorView({
    state,
    parent: targetCell,
    selection: { anchor: cellRange.from, head: cellRange.from },
    // Route any updates to the main view
    dispatch: (tr, subview) => {
      console.log('Dispatching subview transaction')
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
 * A view plugin that passes any transaction from the main view into the various
 * subviews.
 */
export const subviewUpdatePlugin = ViewPlugin.define(view => ({
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
