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
import { EditorState, Prec, StateField, Annotation, Transaction, ChangeSpec } from "@codemirror/state"
import { EditorView, keymap, drawSelection, DecorationSet, Decoration, ViewPlugin, ViewUpdate } from "@codemirror/view"
import markdownParser from "../parser/markdown-parser"

// DEBUG // TODOs
// DEBUG // * See if I have to implement a tabbing method here to properly move
// DEBUG //   the focus to the next table cell
// DEBUG // * When there is a subview in a table, clicking on the next table
// DEBUG //   cell only disabled the existing one, and users have to click a
// DEBUG //   second time to move the focus into that cell

/**
 * This syncAnnotation is used to tag all transactions originating from the main
 * EditorView when dispatching them to the subview to ensure they don't get
 * re-emitted.
 */
const syncAnnotation = Annotation.define<boolean>()

/**
 * A transaction filter that ensures that any changes made to the view that
 * don't come from the main view (i.e., are not synchronizing) are sanitized so
 * that they never exceed the cell's boundaries.
 */
const ensureBoundariesFilter = EditorState.transactionFilter.of((tr) => {
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
  const cursor = tr.startState.field(hiddenSpanField).map(tr.changes).iter(0) // First
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
      console.log('Disallowing transaction', tr)
      return [] // Disallow this transaction
    }
  }

  if (!tr.docChanged) {
    return tr
  }

  // Ensure that any changes are safe to apply without breaking the table or
  // removing things people don't want to remove.
  const safeChanges: ChangeSpec[] = []
  let shouldOverrideTransaction = false
  tr.changes.iterChanges((fromA, toA, fromB, toB, inserted) => {
    // First: Ensure that the transaction does not mess with the hidden ranges
    if (fromA < cellFrom || toA < cellFrom || fromA > cellEndAfter || toA > cellEndAfter) {
      // With this flag set, all other safe changes will be used to override
      // the transaction
      shouldOverrideTransaction = true
      return
    }

    // Next, ensure that no newlines will be inserted into the table cell
    const ins = inserted.toString()
    const safeInsertion = ins.includes('\n') ? ins.replace(/\n+/g, ' ') : ins
    safeChanges.push({ from: fromA, to: toA, insert: safeInsertion })
    if (safeInsertion !== ins) {
      shouldOverrideTransaction = true
    }
  })

  return shouldOverrideTransaction ? { ...tr, changes: safeChanges } : tr
})

/**
 * A StateField whose sole purpose is to hide the two stretches of content
 * before and after the table cell contents.
 */
const hiddenSpanField = StateField.define<DecorationSet>({
  create (state) {
    // NOTE: Override using `init`! Otherwise this extension won't do much.
    return Decoration.none
  },
  update (value, tr) {
    // Ensure the range always stays the same
    return value.map(tr.changes)
  },
  provide: f => EditorView.decorations.from(f)
})

/**
 * Creates a set of four decorations that hide the spans before and after the
 * provided cell range. Provide the result of this function to the hiddenSpanField's init method.
 *
 * @param   {EditorState}                    state   The main editor state
 * @param   {{ from: number, to: number }}  cellRange  The cell range
 *
 * @return  {DecorationSet}                            The initial deco set
 */
function createHiddenDecorations (state: EditorState, cellRange: { from: number, to: number }): DecorationSet {
  const { from, to } = state.doc.lineAt(cellRange.from)
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
      .range(to + 1, state.doc.length)
  ])

}

/**
 * This command can be used to override the default selectAll functionality.
 * Instead of selecting the entire state (= document) it will only select the
 * cell boundaries.
 *
 * @param   {EditorView}  view  The editor view
 *
 * @return  {boolean}           Returns true
 */
function selectAllCommand (view: EditorView): boolean {
  const cursor = view.state.field(hiddenSpanField).iter(0) // First
  cursor.next() // Second
  const cellFrom = cursor.to
  cursor.next() // Third
  const cellTo = cursor.from
  view.dispatch({ selection: { anchor: cellFrom, head: cellTo } })
  return true
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
    selection: mainView.state.selection,
    extensions: [
      // A minimal set of extensions
      keymap.of(defaultKeymap),
      Prec.high(keymap.of([
        // Prevent programmatic insertion of newlines by disabling some keybindings
        { key: 'Return', run: v => true },
        { key: 'Ctrl-Return', run: v => true },
        { key: 'Cmd-Return', run: v => true },
        // Map the undo/redo keys to the main view
        { key: 'Mod-z', run: v => undo(mainView), preventDefault: true },
        { key: 'Mod-Shift-z', run: v => redo(mainView), preventDefault: true },
        // Override the select all command
        { key: 'Mod-a', run: selectAllCommand, preventDefault: true }
      ])),
      drawSelection(),
      // TODO: Light and dark mode switch
      syntaxHighlighting(defaultHighlightStyle),
      EditorView.lineWrapping,
      markdownParser(), // TODO: Config?
      // Two custom extensions that are required for the specific use-case of
      // this single-line minimal EditorView
      hiddenSpanField.init(s => createHiddenDecorations(s, cellRange)),
      ensureBoundariesFilter
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
