/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Supporting code for the text transform tests
 * CVM-Role:        TESTING
 * Maintainers:     Rich Douglas
 * License:         GNU GPL v3
 *
 * Description:     This file has supporting code for the text transform tests.
 *
 * END HEADER
 */

import { EditorSelection, Transaction } from '@codemirror/state'

export function selectAll(text: string): EditorSelection {
  return EditorSelection.create([
    EditorSelection.range(0, text.length)
  ])
}

export function changedTexts(tx: Transaction): string[] {
  let changedTexts: string[] = []

  tx.changes.iterChanges((_fromA, _toA, _fromB, _toB, inserted) => {
    changedTexts.push(inserted.toString())
  })

  return changedTexts
}
