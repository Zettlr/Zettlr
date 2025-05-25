/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Data exchange functions
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the data exchange functionality to
 *                  exchange transaction data between a subview of the table
 *                  editor, and the main view.
 *
 * END HEADER
 */

import { Annotation, Transaction } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'

/**
 * This syncAnnotation is used to tag all transactions originating from the main
 * EditorView when dispatching them to the subview to ensure they don't get
 * re-emitted.
 */
export const syncAnnotation = Annotation.define<boolean>()

export function dispatchFromSubview (mainView: EditorView): (tr: Transaction, subview: EditorView) => void {
  return (tr: Transaction, subview: EditorView) => {
    subview.update([tr])
    if (tr.annotation(syncAnnotation) === undefined && (tr.docChanged || tr.effects.length > 0)) {
      const annotations: Annotation<any>[] = [syncAnnotation.of(true)]
      const userEvent = tr.annotation(Transaction.userEvent)
      if (userEvent !== undefined) {
        annotations.push(Transaction.userEvent.of(userEvent))
      }
      mainView.dispatch({ changes: tr.changes, annotations, effects: tr.effects })
    }
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
export function maybeDispatchToSubview (subview: EditorView, tr: Transaction): void {
  if (tr.annotation(syncAnnotation) !== undefined || (!tr.docChanged && tr.effects.length === 0)) {
    return
  }

  const annotations: Annotation<any>[] = [syncAnnotation.of(true)]
  const userEvent = tr.annotation(Transaction.userEvent)
  if (userEvent !== undefined) {
    annotations.push(Transaction.userEvent.of(userEvent))
  }

  subview.dispatch({
    changes: tr.changes,
    annotations,
    effects: tr.effects,
  })
}
