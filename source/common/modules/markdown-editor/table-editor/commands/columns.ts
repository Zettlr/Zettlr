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

import { type SelectionRange, EditorSelection, type ChangeSpec, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { findColumnIndexByRange, findRowIndexByRange, getColIndicesByRanges, getDelimiterLineCellOffsets, mapSelectionsWithTables } from './util'

/**
 * Attempts to move all cursors/selections to the next cell. NOTE: This command
 * looks at the selection anchors, not the heads, to determine movement.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command has moved any selections
 */
export function moveNextCell (target: EditorView): boolean {
  const tr = mapSelectionsWithTables<TransactionSpec[]>(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    return ctx.ranges.map(range => {
      const colIdx = findColumnIndexByRange(range, ctx.offsets.outer, 'anchor')
      const rowIdx = findRowIndexByRange(range, ctx.offsets.outer, 'anchor')
      if (colIdx === undefined || rowIdx === undefined) {
        return undefined
      }
  
      const lastCol = colIdx === ctx.offsets.outer[rowIdx].length - 1
      const lastRow = rowIdx === ctx.offsets.outer.length - 1
  
      if (lastCol && lastRow) {
        if (ctx.tableAST.tableType === 'grid') {
          return undefined // As of now, support only pipe tables.
        }

        // In this edge case, we want to not do nothing, but instead add a new
        // row and place the cursor in there. This is going to be a bit iffy,
        // but not impossible.

        // First, get the current line ...
        const line = target.state.doc.lineAt(range.from)
        // ... and prepare to insert a duplicate below the table, moving the
        // cursor to the first cell of the new row.
        return {
          changes: {
            from: line.to,
            // Taken from rows.ts
            insert: '\n' + line.text.replace(/[^\s\|]/g, ' ')
          },
          // Move the new cursor to the beginning of the new line.
          selection: { anchor: line.to + 2 }
        }
      }
      
      if (!lastCol) {
        return { selection: { anchor: ctx.offsets.inner[rowIdx][colIdx + 1][0] } }
      } else if (lastCol && !lastRow) {
        return { selection: { anchor: ctx.offsets.inner[rowIdx + 1][0][0] } }
      }

      return undefined
    }).filter(i => i !== undefined)
  }).flat()

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    return ctx.ranges.map(range => {
      const colIdx = findColumnIndexByRange(range, ctx.offsets.outer, 'anchor')
      const rowIdx = findRowIndexByRange(range, ctx.offsets.outer, 'anchor')
      if (colIdx === undefined || rowIdx === undefined) {
        return undefined
      }

      const nCols = ctx.offsets.outer[rowIdx].length

      if (colIdx === 0 && rowIdx === 0) {
        return undefined
      } else if (colIdx > 0) {
        return EditorSelection.cursor(ctx.offsets.inner[rowIdx][colIdx - 1][1])
      } else if (colIdx === 0 && rowIdx > 0) {
        return EditorSelection.cursor(ctx.offsets.inner[rowIdx - 1][nCols - 1][1])
      }
    }).filter(i => i !== undefined)
  }).flat()

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
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    // NOTE: Swapping columns is complex; here we only consider the first range
    const focusRange = ctx.ranges[0]
    const idx = findColumnIndexByRange(focusRange, ctx.offsets.outer)
    if (idx === undefined || idx === ctx.offsets.outer[0].length - 1) {
      return undefined
    }

    const changes = ctx.offsets.outer.flatMap(row => {
      return [
        // Cell 1 -> 0
        {
          from: row[idx][0], to: row[idx][1],
          insert: target.state.sliceDoc(row[idx + 1][0], row[idx + 1][1])
        },
        // Cell 0 -> 1
        {
          from: row[idx + 1][0], to: row[idx + 1][1],
          insert: target.state.sliceDoc(row[idx][0], row[idx][1])
        }
      ]
    })

    const rowIdx = findRowIndexByRange(focusRange, ctx.offsets.outer)!
    const nextCell = ctx.offsets.outer[rowIdx][idx + 1]
    const moveBy =  nextCell[1] - nextCell[0] + 1 // Account for the delimiter

    return {
      changes,
      selection: { anchor: focusRange.anchor + moveBy, head: focusRange.head + moveBy }
    }
  })

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // then, for each row, swap both using the indices.
    // NOTE: Swapping columns is complex; here we only consider the first range
    const focusRange = ctx.ranges[0]
    const idx = findColumnIndexByRange(focusRange, ctx.offsets.outer)
    if (idx === undefined || idx === 0) {
      return undefined
    }

    const changes = ctx.offsets.outer.flatMap(row => {
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

    const rowIdx = findRowIndexByRange(focusRange, ctx.offsets.outer)!
    const prevCell = ctx.offsets.outer[rowIdx][idx - 1]
    const moveBy =  prevCell[1] - prevCell[0] + 1 // Account for the delimiter

    return {
      changes,
      selection: {
        anchor: focusRange.anchor - moveBy, head: focusRange.head - moveBy
      }
    }
  })

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // Only support this in pipe tables.
    if (ctx.tableAST.tableType !== 'pipe') {
      return undefined
    }

    // Again, only respect a single focusRange
    const focusRange = ctx.ranges[0]

    const idx = findColumnIndexByRange(focusRange, ctx.offsets.outer)
    if (idx === undefined) {
      return undefined
    }

    // Now, for each row, calculate a change that adds '|  ' after the cell's to
    // position. We also need to add '|--' to the delimiter

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = ctx.tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)

    const changes = [
      { from: delimLine.from + delimOffsets[idx][1], insert: `${delimChar}--` },
      ...ctx.offsets.outer.flatMap(row => {
        return { from: row[idx][1], insert: '|  ' }
      }).sort((a, b) => a.from - b.from)
    ]

    // Move the selection so that it ends up in the newly added column. NOTE
    // that we have to account for the added characters in the delimiter row.
    const rangeLine = target.state.doc.lineAt(focusRange.head)
    const firstLine = target.state.doc.lineAt(ctx.tableAST.from)
    const rowIdx = findRowIndexByRange(focusRange, ctx.offsets.outer)!
    // First, move the range so that it stays in place
    let moveBy = (rangeLine.number - firstLine.number) * 3
    const thisCellTo = ctx.offsets.outer[rowIdx][idx][1]
    // Second, add enough characters to make the cursor end up in the added col.
    moveBy += thisCellTo - focusRange.to + 2

    return {
      changes, selection: {
        anchor: focusRange.anchor + moveBy, head: focusRange.head + moveBy
      }
    }
  })

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // Only support this in pipe tables.
    if (ctx.tableAST.tableType !== 'pipe') {
      return undefined
    }

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = ctx.tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)

    const focusRange = ctx.ranges[0]
    const idx = findColumnIndexByRange(focusRange, ctx.offsets.outer)

    if (idx === undefined) {
      return
    }

    // Now, for each row, calculate a change that adds ' | ' before the cell's
    // from position. We also need to add '-|-' to the delimiter

    const changes = [
      { from: delimLine.from + delimOffsets[idx][0], insert: `--${delimChar}` },
      ...ctx.offsets.outer.flatMap(row => {
        return { from: row[idx][0], insert: '  |' }
      }).sort((a, b) => a.from - b.from)
    ]

    // Move the selection so that it ends up in the newly added column. NOTE
    // that we have to account for the added characters in the delimiter row.
    const rangeLine = target.state.doc.lineAt(focusRange.head)
    const firstLine = target.state.doc.lineAt(ctx.tableAST.from)
    // First, move the range so that it stays in place
    let moveBy = (rangeLine.number - firstLine.number + 1) * 3
    // Second, remove characters to make the cursor end up in the added col.
    const rowIdx = findRowIndexByRange(focusRange, ctx.offsets.outer)!
    const cellOffset = focusRange.from - ctx.offsets.outer[rowIdx][idx][0]
    moveBy -= cellOffset + 2

    return {
      changes,
      selection: {
        anchor: focusRange.anchor + moveBy, head: focusRange.head + moveBy
      }
    }
  })

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, ctx => {
    // Only support this in pipe tables. TODO
    if (ctx.tableAST.tableType !== 'pipe') {
      return undefined
    }

    const colIdx = getColIndicesByRanges(ctx.ranges, ctx.offsets.outer)

    // NOTE: Remove `null` since that check will be performed during AST parsing
    const delimNode = ctx.tableNode.getChild('TableDelimiter')!
    const delimLine = target.state.doc.lineAt(delimNode.from)
    const delimChar = delimLine.text.includes('+') ? '+' : '|' // Support emacs
    const delimOffsets = getDelimiterLineCellOffsets(delimLine.text, delimChar)

    return [
      // Handle the delimiter line
      ...colIdx.map(col => {
        const [ delimFrom, delimTo ] = delimOffsets[col]
        return {
          from: delimLine.from + delimFrom,
          to: delimLine.from + (delimTo < delimLine.text.length ? delimTo + 1 : delimTo),
          insert: ''
        }
      }),
      ...ctx.offsets.outer.flatMap(row => {
        return colIdx.map(col => {
          const [ from, to ] = row[col]
          const line = target.state.doc.lineAt(from)
          // Take the following char after `to` iff we're not at the end of the line
          return { from, to: to < line.to ? to + 1 : to, insert: '' }
        })
      })
    ]
  }).flat()
  
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
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, ctx => {
    // Only support this in pipe tables. TODO
    if (ctx.tableAST.tableType !== 'pipe') {
      return undefined
    }

    const colIdx = getColIndicesByRanges(ctx.ranges, ctx.offsets.outer)

    // TODO: Iterate over all ranges (but only once per column)
    const idx = findColumnIndexByRange(ctx.ranges[0], ctx.offsets.outer)
    if (idx === undefined) {
      return undefined
    }


    return ctx.offsets.outer.flatMap(row => {
      return colIdx.map(idx => {
        const [ from, to ] = row[idx]
        return { from, to, insert: ' '.repeat(to - from) }
      })
    })
  }).flat()
  
  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}
