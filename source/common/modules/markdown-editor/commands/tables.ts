/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands
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

import { syntaxTree } from '@codemirror/language'
import { ChangeSpec, EditorSelection, SelectionRange } from '@codemirror/state'
import { EditorView } from '@codemirror/view'
import { parseTableNode } from '../../markdown-utils/markdown-ast/parse-table-node'
import { SyntaxNode } from '@lezer/common'

/**
 * Takes a tale node and the corresponding Markdown source and returns a list of
 * the cell offsets (from, to) for every cell in the table, sorted by rows. The
 * structure of the return value is `[rows][cells][from, to]`.
 *
 * @param   {SyntaxNode}  tableNode  The table SyntaxNode
 * @param   {string}      markdown   The original Markdown source
 *
 * @return  {[number, number][][]}   The [from, to] offsets of all Table cells
 */
function getTableCellOffsets (tableNode: SyntaxNode, markdown: string): [number, number][][] {
  const ast = parseTableNode(tableNode, markdown)
  const offsets = ast.rows.map(row => {
    return row.cells.map(cell => {
      return [ cell.from, cell.to ]
    }) as [number, number][]
  })
  return offsets
}

/**
 * Helper function that makes implementing the table commands simpler due to
 * centrally collecting generally required logic, collecting the required info
 * before handing off to the user-provided callback that will perform the actual
 * operation.
 * 
 * This function will call `callback` for every selection range that is
 * contained within a Table node somewhere within the document. It will provide
 * the Table's SyntaxNode and all table cell offsets within that table. The
 * callback is guaranteed to receive a range that is contained within a table.
 *
 * @param   {EditorView}  target    The target EditorView on which to perform
 *                                  the operation
 * @param   {Callable}    callback  The callback to use. Receives 3 arguments:
 *                                  * `range`: The SelectionRange
 *                                  * `table`: The Table SyntaxNode
 *                                  * `offsets`: The Table's cell offsets
 *
 *                                  Can return T or undefined.
 *
 * @return  {T[]}                   Returns an array of whatever type the user
 *                                  callback returns.
 */
function mapSelectionsWithTables<T> (
  target: EditorView,
  callback: (
    range: SelectionRange,
    table: SyntaxNode,
    offsets: ReturnType<typeof getTableCellOffsets>
  ) => T|undefined
): T[] {
  // TODO: Is not recursive! Need to iter!
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')

  return target.state.selection.ranges.map(range => {
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }
    const offsets = getTableCellOffsets(table, target.state.sliceDoc())
    return callback(range, table, offsets)
  })
    .filter(sel => sel !== undefined) // Filter out undefineds
}

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
 * This command takes all editor selections and moves those within tables to the
 * next row, same cell offset.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether any movement has happened
 */
export function moveNextRow (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, table, offsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const rowIndex = offsets.findIndex(cellOffsets => {
      return cellOffsets.some(off => off[0] <= range.anchor && off[1] >= range.anchor)
    })

    if (rowIndex < 0 || rowIndex === offsets.length - 1) {
      return undefined
    } else {
      const row = offsets[rowIndex]
      const cellIndex = row.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)
      if (cellIndex < 0) {
        return undefined
      }

      return EditorSelection.cursor(offsets[rowIndex + 1][cellIndex][0])
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
 * This command takes all editor selections and moves those within tables to the
 * previous row, same cell offset.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether any movement has happened
 */
export function movePrevRow (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, (range, table, offsets) => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    const rowIndex = offsets.findIndex(cellOffsets => {
      return cellOffsets.some(off => off[0] <= range.anchor && off[1] >= range.anchor)
    })

    if (rowIndex <= 0) {
      return undefined
    } else {
      const row = offsets[rowIndex]
      const cellIndex = row.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)
      if (cellIndex < 0) {
        return undefined
      }

      return EditorSelection.cursor(offsets[rowIndex - 1][cellIndex][0])
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

/**
 * For any selection ranges within a table, this function swaps the anchor's row
 * with the next one if applicable, accounting for table type and header rows.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether any swaps have happened.
 */
export function swapNextRow (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, table, offsets) => {
    // TODO: What if selection spans multiple rows? The user then clearly
    // intends to move them all together
    const tableAST = parseTableNode(table, target.state.sliceDoc())
    const thisLine = target.state.doc.lineAt(range.anchor)
    const lastLine = target.state.doc.lineAt(table.to)
    if (thisLine.number === target.state.doc.lines || thisLine.number === lastLine.number) {
      return undefined
    }

    if (tableAST.tableType === 'grid') {
      // Handle a grid table
      let nextLine = target.state.doc.line(thisLine.number + 2)
      if (nextLine.number > lastLine.number || nextLine.number >= target.state.doc.lines) {
        return undefined
      }
      return [
        { from: thisLine.from, to: thisLine.to, insert: nextLine.text },
        { from: nextLine.from, to: nextLine.to, insert: thisLine.text }
      ]
    } else {
      // Handle a pipe table
      let nextLine = target.state.doc.line(thisLine.number + 1)
      if (/^[|:-]+$/.test(nextLine.text)) {
        // We have to swap the lines to retain the header row
        nextLine = target.state.doc.line(nextLine.number + 1)
        changes.push(
          { from: thisLine.from, to: thisLine.to, insert: nextLine.text },
          { from: nextLine.from, to: nextLine.to, insert: thisLine.text }
        )
      } else {
        // Regular swap
        return [
          { from: thisLine.from, to: thisLine.to + 1, insert: '' },
          { from: nextLine.to, to: nextLine.to, insert: '\n' + thisLine.text }
        ]
      }
    }
  }).flat() // NOTE: We're receiving 2d arrays from the callback

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

/**
 * Swaps table rows to the top.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether any swaps occurred
 */
export function swapPrevRow (target: EditorView): boolean {
  const changes = mapSelectionsWithTables(target, (range, table, offsets) => {
    // TODO: What if selection spans multiple rows? The user then clearly intends
    // to move them all together
    const tableAST = parseTableNode(table, target.state.sliceDoc())
    const thisLine = target.state.doc.lineAt(range.anchor)
    const firstLine = target.state.doc.lineAt(table.from)
    if (thisLine.number === 1 || thisLine.number === firstLine.number) {
      return undefined
    }

    if (tableAST.tableType === 'grid') {
      // Handle a grid table
      let prevLine = target.state.doc.line(thisLine.number - 2)
      if (prevLine.number < firstLine.number || prevLine.number < 1) {
        return undefined
      }
      return [
        { from: thisLine.from, to: thisLine.to, insert: prevLine.text },
        { from: prevLine.from, to: prevLine.to, insert: thisLine.text }
      ]
    } else {
      // Handle a pipe table
      let prevLine = target.state.doc.line(thisLine.number - 1)
      if (/^[|:-]+$/.test(prevLine.text)) {
        // We have to swap the lines to retain the header row
        prevLine = target.state.doc.line(prevLine.number - 1)
        return [
          { from: thisLine.from, to: thisLine.to, insert: prevLine.text },
          { from: prevLine.from, to: prevLine.to, insert: thisLine.text }
        ]
      } else {
        // Regular swap
        return [
          { from: thisLine.from, to: thisLine.to + 1, insert: '' },
          { from: prevLine.from, to: prevLine.from, insert: thisLine.text + '\n' }
        ]
      }
    }
  }).flat() // NOTE: We're receiving 2d arrays from the callback

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

export function addRowAfter (target: EditorView): boolean {
  return false
}

export function addColAfter (target: EditorView): boolean {
  return false
}

export function addRowBefore (target: EditorView): boolean {
  return false
}

export function addColBefore (target: EditorView): boolean {
  return false
}

export function deleteRow (target: EditorView): boolean {
  return false
}

export function deleteCol (target: EditorView): boolean {
  return false
}

export function setAlignmentLeft (target: EditorView): boolean {
  return false
}

export function setAlignmentCenter (target: EditorView): boolean {
  return false
}

export function setAlignmentRight (target: EditorView): boolean {
  return false
}

export function clearRow (target: EditorView): boolean {
  return false
}

export function clearCol (target: EditorView): boolean {
  return false
}

export function clearTable (target: EditorView): boolean {
  return false
}

// Utility/Helper function that adds appropriate spacing
export function alignTable (/* TODO: Parameters */): void {
}
