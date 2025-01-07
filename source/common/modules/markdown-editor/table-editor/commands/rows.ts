/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands (rows)
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
import { parseTableNode } from '@common/modules/markdown-utils/markdown-ast/parse-table-node'

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
 * For any selection ranges within a table, this function swaps the anchor's row
 * with the next one if applicable, accounting for table type and header rows.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether any swaps have happened.
 */
export function swapNextRow (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, (range, table, _offsets) => {
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
  const changes = mapSelectionsWithTables(target, (range, table, _offsets) => {
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

export function addRowAfter (_target: EditorView): boolean {
  return false
}

export function addRowBefore (_target: EditorView): boolean {
  return false
}

export function deleteRow (_target: EditorView): boolean {
  return false
}

export function clearRow (_target: EditorView): boolean {
  return false
}

