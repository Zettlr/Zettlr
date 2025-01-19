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
import { findColumnIndexByRange, getDelimiterLineCellOffsets, mapSelectionsWithTables } from './util'

/**
 * Attempts to move all cursors/selections to the next cell. NOTE: This command
 * looks at the selection anchors, not the heads, to determine movement.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command has moved any selections
 */
export function moveNextCell (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    const offsets = cellOffsets.flat() // Remove the rows
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const idx = findColumnIndexByRange(range, cellOffsets, 'anchor')
    if (idx === undefined || idx === offsets.length - 1) {
      return undefined
    }

    return EditorSelection.cursor(offsets[idx + 1][0])
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
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    const offsets = cellOffsets.flat() // Remove the rows
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const idx = findColumnIndexByRange(range, cellOffsets, 'anchor')
    if (idx === undefined) {
      return undefined
    }
    
    return idx === 0 ? undefined : EditorSelection.cursor(offsets[idx - 1][1])
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
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }

    return cellOffsets.flatMap(row => {
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
    })
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
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }

    return cellOffsets.flatMap(row => {
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
    })
  })

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * For each selection in the document that is within a table, add a column after
 * the column that contains the selection.
 *
 * @param   {EditorView}  target  The EditorView to apply the command to.
 *
 * @return  {boolean}             Whether or not changes have been made.
 */
export function addColAfter (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    // Only support this in pipe tables. TODO
    if (tableAST.tableType !== 'pipe') {
      return undefined
    }

    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }

    // Now, for each row, calculate a change that adds ' | ' after the cell's to
    // position. We also need to add '-|-' to the delimiter

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)

    return [
      { from: delimLine.from + delimOffsets[idx][1], insert: `-${delimChar}-` },
      ...cellOffsets.flatMap(row => {
        return { from: row[idx][1], insert: ' | ' }
      }).sort((a, b) => a.from - b.from)
    ]
  }, 'outer').flat() // NOTE: Outer margins // Returns a 2d array above

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * For each selection in the document that is within a table, add a column
 * before the column that contains the selection.
 *
 * @param   {EditorView}  target  The EditorView to apply the command to.
 *
 * @return  {boolean}             Whether or not changes have been made.
 */
export function addColBefore (target: EditorView): boolean {
  // Basically the same as addColAfter, with minor changes
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, tableNode, tableAST, cellOffsets) => {
    // Only support this in pipe tables. TODO
    if (tableAST.tableType !== 'pipe') {
      return undefined
    }

    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }

    // Now, for each row, calculate a change that adds ' | ' before the cell's
    // from position. We also need to add '-|-' to the delimiter

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)

    return [
      { from: delimLine.from + delimOffsets[idx][0], insert: `-${delimChar}-` },
      ...cellOffsets.flatMap(row => {
        return { from: row[idx][0], insert: ' | ' }
      }).sort((a, b) => a.from - b.from)
    ]
  }, 'outer').flat() // NOTE: Outer margins // Returns a 2d array above

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * For each selection in the document that is within a table, delete the column
 * that contains the selection.
 *
 * @param   {EditorView}  target  The EditorView to apply the command to.
 *
 * @return  {boolean}             Whether or not changes have been made.
 */
export function deleteCol (target: EditorView): boolean {
  // To delete the current column, we basically just have to replace its inner
  // cell content (incl. padding) plus the following delimiter (if applicable)
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, (range, tableNode, tableAST, cellOffsets) => {
    // Only support this in pipe tables. TODO
    if (tableAST.tableType !== 'pipe') {
      return undefined
    }

    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)
    const [ delimFrom, delimTo ] = delimOffsets[idx]

    return [
      // Handle the delimiter line
      {
        from: delimLine.from + delimFrom,
        to: delimLine.from + (delimTo < delimLine.text.length ? delimTo + 1 : delimTo),
        insert: ''
      },
      ...cellOffsets.flatMap(row => {
        const [ from, to ] = row[idx]
        const line = target.state.doc.lineAt(from)
        // Take the following char after `to` iff we're not at the end of the line
        return { from, to: to < line.to ? to + 1 : to, insert: '' }
      })
    ]
  }, 'outer').flat() // NOTE: Request the outer cell offsets
  
  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * For each selection in the document that is within a table, clear out the
 * column that contains the selection.
 *
 * @param   {EditorView}  target  The EditorView to apply the command to.
 *
 * @return  {boolean}             Whether or not changes have been made.
 */
export function clearCol (target: EditorView): boolean {
  // To clear the current column, we basically just have to replace its inner
  // cell content (excl. padding) with whitespace
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, (range, tableNode, tableAST, cellOffsets) => {
    // Only support this in pipe tables. TODO
    if (tableAST.tableType !== 'pipe') {
      return undefined
    }

    const idx = findColumnIndexByRange(range, cellOffsets)
    if (idx === undefined) {
      return undefined
    }


    return cellOffsets.flatMap(row => {
      const [ from, to ] = row[idx]
      return { from, to, insert: ' '.repeat(to - from) }
    })
  }).flat() // NOTE: Request the outer cell offsets
  
  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}
