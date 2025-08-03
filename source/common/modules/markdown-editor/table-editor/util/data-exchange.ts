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
      mainView.dispatch({ ...tr, annotations })
    }
  }
}

/**
* This function takes a transaction coming from the main EditorView (i.e., the
* document itself), and applies that transaction to a subview (i.e., an
* EditorView that only handles editing a single table cell). It does not apply
* transactions marked as syncAnnotation (because those originate from the
* subview and thus cannot be applied again), or which neither change nor add
* effects to the document (effects are only relevant to the main editor).
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

  subview.dispatch({ ...tr, annotations })
}
