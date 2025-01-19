/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands (tables)
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file exposes a series of CodeMirror commands that make
 *                  working with tables easier and allow for keyboard-based
 *                  manipulation of them.
 *
 * END HEADER
 */

import type { EditorView } from '@codemirror/view'
import { mapSelectionsWithTables } from './util'
import type { ChangeSpec } from '@codemirror/state'

export function setAlignmentLeft (_target: EditorView): boolean {
  return false
}

export function setAlignmentCenter (_target: EditorView): boolean {
  return false
}

export function setAlignmentRight (_target: EditorView): boolean {
  return false
}

/**
 * Clears all tables with selections inside them.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has applied any changes.
 */
export function clearTable (target: EditorView): boolean {
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, (range, tableNode, tableAST, offsets) => {
    // Map over the offset rows, and then simply yield changes that replace each
    // table cell with whitespace, flattening the array
    return offsets.flatMap(row => row.map(([ from, to ]) => ({ from, to, insert: ' '.repeat(to - from) })))
  }).flat() // Flatten the corresponding array

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

// Utility/Helper function that adds appropriate spacing
export function alignTable (/* TODO: Parameters */): void {
}
