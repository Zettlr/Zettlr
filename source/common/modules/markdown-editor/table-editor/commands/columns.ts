/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands (columns)
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

import { type SelectionRange, EditorSelection, type ChangeSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { mapSelectionsWithTables } from './util'

/**
 * Attempts to move all cursors/selections to the next cell. NOTE: This command
 * looks at the selection anchors, not the heads, to determine movement.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command has moved any selections
 */
export function moveNextCell (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, table, cellOffsets) => {
    const offsets = cellOffsets.flat() // Remove the rows
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const cellIndex = offsets.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)

    if (cellIndex === -1 || cellIndex === offsets.length - 1) {
      return undefined
    } else {
      return EditorSelection.cursor(offsets[cellIndex + 1][0])
    }
  })

  if (newSelections.length > 0) {
    target.dispatch({ selection: EditorSelection.create(newSelections) })
    return true
  } else {
    return false
  }
}

/**
 * Attempts to move all cursors/selections to the previous cell. NOTE: This
 * command looks at the selection anchors to determine movement, not the heads.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command has moved any selections
 */
export function movePrevCell (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, table, cellOffsets) => {
    const offsets = cellOffsets.flat() // Remove the rows
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const cellIndex = offsets.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)

    if (cellIndex <= 0) {
      return undefined
    } else {
      return EditorSelection.cursor(offsets[cellIndex - 1][1])
    }
  })

  if (newSelections.length > 0) {
    target.dispatch({ selection: EditorSelection.create(newSelections) })
    return true
  } else {
    return false
  }
}

/**
 * Swaps the columns where cursors currently are within TableNodes with the
 * following ones where possible.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether there has been at least one change.
 */
export function swapNextCol (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, table, offsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    const cellIndex = offsets.map(row => {
      return row.findIndex(cell => cell[0] <= range.anchor && cell[1] >= range.anchor)
    })
      .filter(sel => sel > -1)

    // Now cellIndex should contain exactly one index, and there should be a
    // cell afterwards.
    if (cellIndex.length !== 1 || cellIndex[0] >= offsets[0].length) {
      return undefined
    }

    const idx = cellIndex[0]

    return offsets.map(row => {
      return [
        // Cell 1 -> 0
        {
          from: row[idx][0],
          to: row[idx][1],
          insert: target.state.sliceDoc(row[idx + 1][0], row[idx + 1][1])
        },
        // Cell 0 -> 1
        {
          from: row[idx + 1][0],
          to: row[idx + 1][1],
          insert: target.state.sliceDoc(row[idx][0], row[idx][1])
        }
      ]
    }).flat()
  })

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * Swaps the previous column with the column containing the cursor for each
 * selection contained within a table.
 *
 * @param   {EditorView}  target  The target view.
 *
 * @return  {boolean}             Whether at least one column has been swapped.
 */
export function swapPrevCol (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, table, offsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    const cellIndex = offsets.map(row => {
      return row.findIndex(cell => cell[0] <= range.anchor && cell[1] >= range.anchor)
    })
      .filter(sel => sel > -1)

    // Now cellIndex should contain exactly one index, and there should be a
    // cell afterwards.
    if (cellIndex.length !== 1 || cellIndex[0] < 1) {
      return undefined
    }

    const idx = cellIndex[0]

    return offsets.map(row => {
      return [
        // Cell 0 -> 1
        {
          from: row[idx - 1][0],
          to: row[idx - 1][1],
          insert: target.state.sliceDoc(row[idx][0], row[idx][1])
        },
        // Cell 1 -> 0
        {
          from: row[idx][0],
          to: row[idx][1],
          insert: target.state.sliceDoc(row[idx - 1][0], row[idx - 1][1])
        }
      ]
    }).flat()
  })

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

export function addColAfter (target: EditorView): boolean {
  return false
}

export function addColBefore (target: EditorView): boolean {
  return false
}

export function clearCol (target: EditorView): boolean {
  return false
}
