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

import { defaultKeymap, redo, undo } from "@codemirror/commands"
import { syntaxHighlighting, defaultHighlightStyle } from "@codemirror/language"
import { EditorState, Prec, StateField, Annotation, Transaction, Extension } from "@codemirror/state"
import { EditorView, keymap, drawSelection, DecorationSet, Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view"
import markdownParser from "../parser/markdown-parser"

// DEBUG // Remaining TODOs for the basic usability state:
// DEBUG // * The user can currently delete the complete hidden spans of the
// DEBUG //   document by pressing backspace or delete (backward & forward)

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
 * @param   {StateField<DecorationSet>}  field  The instantiated boundaries
 *                                              field to retrieve the current
 *                                              cell boundaries from.
 *
 * @return  {Extension}                         The view extension
 */
function ensureBoundariesPlugin (field: StateField<DecorationSet>): Extension {
  return EditorState.transactionFilter.of((tr) => {
    if (tr.annotation(syncAnnotation) === true) {
      return tr // Do not mess with synchronizing transactions
    }

    // NOTE: There are also cell boundaries written to the TD/TH's dataset, but
    // we can't use those since they strictly exclude *any* whitespace from the
    // cell's contents. This means that, would we use those to determine the
    // selection ranges, any time a user enters a space, this space would be
    // considered "out of the cell", and as such the user could not enter any
    // text afterwards. By looking at the hide-decorations (which are
    // constantly mapped through any changes and thus constitute a "moving
    // target") we can account for that. Basically, the hideDeco field "freezes"
    // the spaces outside of the table cell on editing, and therefore adds any
    // manually added space to the cell's content.

    // Here, we retrieve the boundaries from the given StateField. By mapping
    // only those through the ChangeSet and not recomputing the entire state
    // (e.g., by accessing tr.state), we keep the computational overhead small.
    const cursor = tr.startState.field(field).map(tr.changes).iter(0) // First
    cursor.next() // Second
    const cellFrom = cursor.to
    cursor.next() // Third
    const cellTo = cursor.from

    // First, find the longest cell range after the transaction has been
    // applied. This is necessary to accurately figure out whether the selection
    // will be moved past where the cell boundaries will end up after applying
    // this transaction. In practical terms: If the user inserts a character at
    // the very end of the table cell, the selection will be one position beyond
    // the current cell range. This check means that we account for that.
    let cellEndAfter = cellTo
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (fromA >= cellFrom && toA <= cellTo && toB > cellEndAfter) {
        cellEndAfter = toB
      }
    })

    // TODO: Right now it works all adequately for our purposes. There is one
    // edge-case, though: The CodeMirror parser counts as TableCell contents
    // exclusively non-whitespace within the cell, and excludes any whitespace
    // before and after. This means that, if the user types a space, and then
    // attempts to write something, this would prevent this, as the cursor is
    // now outside of what is considered the cell range for CodeMirror. However,
    // it should be noted that the hide-decorations still accurately reflect the
    // proper boundaries (they include any whitespace that was in the cell
    // before the view got instantiated, but exclude any whitespace added to the
    // cell after the fact.)
    if (tr.selection !== undefined && cellFrom !== cellTo && cellTo > 0) {
      const { from, to } = tr.selection.main
      if (from < cellFrom || to > cellEndAfter) {
        return [] // Disallow this transaction
      }
    }
  
    if (!tr.docChanged) {
      return tr
    }
  
    // TODO: Instead of simply disallowing this transaction, it would be nice to
    // exchange newlines appropriately, e.g., with spaces. In a future update,
    // we could even enable users to drop CSV data into a table so that newlines
    // make the editor create rows as it goes.
    let hasNewline = false
    tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
      if (hasNewline || inserted.sliceString(0).includes('\n')) {
        hasNewline = true
      }
    })

    // TODO: The user may also press backspace or delete and is able to actually
    // delete the hidden document ranges. This needs to be addressed!
  
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
 * @return  {StateField<DecorationSet>}                The extension for the view
 */
function hideBeforeAndAfterCell (mainView: EditorView, cellRange: { from: number, to: number }): StateField<DecorationSet> {
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
  // Instantiate our custom fields here, so that we can reference them, e.g.,
  // to retrieve its value
  const hideDecoField = hideBeforeAndAfterCell(mainView, cellRange)
  const boundariesPlugin = ensureBoundariesPlugin(hideDecoField)

  const state = EditorState.create({
    // Subviews always hold the entire document. This is to make synchronizing
    // updates between main and subviews faster and simpler. This should only
    // become a problem on very old computers for people working with 100MB
    // documents. This assumes that this would be an edge case. Note to future
    // me: "You knew there was going to be this guy who now keeps peskering me
    // because he can't edit his ten-million line JSON files without waiting
    // three seconds for the changes to be applied to his overweight text file."
    doc: mainView.state.sliceDoc(),
    selection: mainView.state.selection,
    extensions: [
      // A minimal set of extensions
      keymap.of(defaultKeymap),
      Prec.high(keymap.of([
        // Disable a few shortcuts, preventing programmatic insertion of newlines
        { key: 'Return', run: (view) => true },
        { key: 'Ctrl-Return', run: (view) => true },
        { key: 'Cmd-Return', run: (view) => true },
        // Map the undo/redo keys to the main view
        { key: 'Mod-z', run: v => undo(mainView), preventDefault: true },
        { key: 'Mod-Shift-z', run: v => redo(mainView), preventDefault: true }
      ])),
      drawSelection(),
      // TODO: Light and dark mode switch
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      markdownParser(), // TODO: Config?
      // Two custom extensions that are required for the specific use-case of
      // this single-line minimal EditorView
      hideDecoField,
      boundariesPlugin
    ]
  })

  const subview = new EditorView({
    state,
    parent: targetCell,
    // Route any updates to the main view
    dispatch: (tr, subview) => {
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
