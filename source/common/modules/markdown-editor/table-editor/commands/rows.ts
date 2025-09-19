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

import { type SelectionRange, EditorSelection, type TransactionSpec } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import { findColumnIndexByRange, findRowIndexByRange, getRowIndicesByRanges, isGridTableDelimRow, isPipeTableDelimRow, mapSelectionsWithTables } from './util'

/**
 * This command takes all editor selections and moves those within tables to the
 * next row, same cell offset.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether any movement has happened
 */
export function moveNextRow (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    return ctx.ranges.map(range => {
      const rowIndex = findRowIndexByRange(range, ctx.offsets.outer, 'anchor')
      const cellIndex = findColumnIndexByRange(range, ctx.offsets.outer, 'anchor')

      if (rowIndex === undefined || cellIndex === undefined) {
        return undefined
      }

      if (rowIndex === ctx.offsets.outer.length - 1) {
        return undefined
      }
  
      // NOTE that we move by the inner offsets here
      return EditorSelection.cursor(ctx.offsets.inner[rowIndex + 1][cellIndex][0])
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
 * This command takes all editor selections and moves those within tables to the
 * previous row, same cell offset.
 *
 * @param   {EditorView}  target  The EditorView
 *
 * @return  {boolean}             Whether any movement has happened
 */
export function movePrevRow (target: EditorView): boolean {
  const newSelections: SelectionRange[] = mapSelectionsWithTables(target, ctx => {
    // Now with the offsets at hand, it's relatively easy: We only need to find
    // the cell in which the cursor is in, then see if there is a next one, and
    // return a cursor that points to the start of the next cell.
    return ctx.ranges.map(range => {
      const rowIndex = findRowIndexByRange(range, ctx.offsets.outer, 'anchor')
      const cellIndex = findColumnIndexByRange(range, ctx.offsets.outer, 'anchor')

      if (rowIndex === undefined || cellIndex === undefined || rowIndex === 0) {
        return undefined
      }
  
      // NOTE that we move by the inner offsets
      return EditorSelection.cursor(ctx.offsets.inner[rowIndex - 1][cellIndex][0])
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
 * For any selection ranges within a table, this function swaps the anchor's row
 * with the next one if applicable, accounting for table type and header rows.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether any swaps have happened.
 */
export function swapNextRow (target: EditorView): boolean {
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // TODO: What if selection spans multiple rows? The user then clearly
    // intends to move them all together
    // NOTE: Swapping is complex; here we only consider the first range
    const focusRange = ctx.ranges[0]
    const thisLine = target.state.doc.lineAt(focusRange.head)
    const lastLine = target.state.doc.lineAt(ctx.tableNode.to)
    if (thisLine.number === target.state.doc.lines || thisLine.number === lastLine.number) {
      return undefined
    }

    if (ctx.tableAST.tableType === 'grid') {
      // Handle a grid table
      let nextLine = target.state.doc.line(thisLine.number + 2)
      if (nextLine.number > lastLine.number || nextLine.number >= target.state.doc.lines) {
        return undefined
      }

      return {
        selection: { anchor: focusRange.anchor, head: focusRange.head },
        changes: [
          { from: thisLine.from, to: thisLine.to, insert: nextLine.text },
          { from: nextLine.from, to: nextLine.to, insert: thisLine.text }
        ]
      }
    } else {
      // Handle a pipe table
      let nextLine = target.state.doc.line(thisLine.number + 1)
      let selectionOffset = thisLine.text.length + 1 // Account for the \n
      if (isPipeTableDelimRow(nextLine.text)) {
        // We have to modify nextLine and the selectionOffset to "jump over" the
        // header row
        nextLine = target.state.doc.line(nextLine.number + 1)
        selectionOffset += nextLine.text.length + 1 // Account for the 2nd \n
      }
      const diff = nextLine.text.length - thisLine.text.length
      selectionOffset += diff
      return {
        selection: {
          anchor: focusRange.anchor + selectionOffset,
          head: focusRange.head  + selectionOffset
        },
        changes: [
          { from: thisLine.from, to: thisLine.to, insert: nextLine.text },
          { from: nextLine.from, to: nextLine.to, insert: thisLine.text }
        ]
      }
    }
  }).flat() // NOTE: We're receiving 2d arrays from the callback

  if (tr.length > 0) {
    target.dispatch(...tr)
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
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // TODO: What if selection spans multiple rows? The user then clearly
    // intends to move them all together
    // NOTE: Swapping is complex; here we only consider the first range
    const focusRange = ctx.ranges[0]
    const thisLine = target.state.doc.lineAt(focusRange.head)
    const firstLine = target.state.doc.lineAt(ctx.tableNode.from)
    if (thisLine.number === 1 || thisLine.number === firstLine.number) {
      return undefined
    }

    if (ctx.tableAST.tableType === 'grid') {
      // Handle a grid table
      let prevLine = target.state.doc.line(thisLine.number - 2)
      if (prevLine.number < firstLine.number || prevLine.number < 1) {
        return undefined
      }
      return {
        selection: { anchor: focusRange.anchor, head: focusRange.head },
        changes: [
          { from: thisLine.from, to: thisLine.to, insert: prevLine.text },
          { from: prevLine.from, to: prevLine.to, insert: thisLine.text }
        ]
      }
    } else {
      // Handle a pipe table
      let prevLine = target.state.doc.line(thisLine.number - 1)
      let selectionOffset = thisLine.text.length + 1 // Account for \n
      if (isPipeTableDelimRow(prevLine.text)) {
        // We have to swap the lines to retain the header row
        selectionOffset += prevLine.text.length + 1 // Account for \n
        prevLine = target.state.doc.line(prevLine.number - 1)
      }
      const diff = prevLine.text.length - thisLine.text.length
      selectionOffset += diff
      return {
        selection: {
          anchor: focusRange.anchor - selectionOffset,
          head: focusRange.head  - selectionOffset
        },
        changes: [
          { from: thisLine.from, to: thisLine.to, insert: prevLine.text },
          { from: prevLine.from, to: prevLine.to, insert: thisLine.text }
        ]
      }
    }
  }).flat() // NOTE: We're receiving 2d arrays from the callback

  if (tr.length > 0) {
    target.dispatch(...tr)
    return true
  } else {
    return false
  }
}

/**
 * Adds a row to a table after the one the cursor is in.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has changed anything
 */
export function addRowAfter (target: EditorView): boolean {
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    const focusRange = ctx.ranges[0]
    const thisLine = target.state.doc.lineAt(focusRange.head)
    if (ctx.tableAST.tableType === 'pipe') {
      // Did the user select the divider? The second check is necessary as the
      // regex also matches empty lines
      if (isPipeTableDelimRow(thisLine.text)) {
        return undefined
      }

      // Places the selection to the same column in the next line (does not yet exist)
      let selectionOffset = thisLine.length

      const lineCount = target.state.doc.lines
      let isHeader = false
      let nextLine = thisLine.number < lineCount ? target.state.doc.line(thisLine.number + 1) : undefined
      if (nextLine !== undefined && isPipeTableDelimRow(nextLine.text) && nextLine.number < lineCount) {
        // Next line is the header, so we have to add a line thereafter
        isHeader = true
        selectionOffset += nextLine.length + 1
      }

      return {
        selection: {
          anchor: focusRange.anchor + selectionOffset,
          head: focusRange.head + selectionOffset
        },
        changes: {
          from: isHeader && nextLine !== undefined ? nextLine.to : thisLine.to,
          insert: '\n' + thisLine.text.replace(/[^\s\|]/g, ' ')
        }
      }
    } else {
      // Grid table
      // The user may have the cursor in a divider or a content row
      if (/^[\s+=:-]+$/.test(thisLine.text)) {
        return undefined
      }
      const nextLine = target.state.doc.line(thisLine.number + 1)
      return {
        from: nextLine.number === target.state.doc.lines ? nextLine.to : nextLine.to + 1,
        insert: thisLine.text.replace(/[^\s|+=]/g, ' ') + '\n' + nextLine.text + '\n'
      }
    }
  })

  // What we should do here (and in addRowBefore) is stupidly simple: Just take
  // the current row (grid tables = this + next one), remove every character between
  // the pipes and put it after the row. Maybe even works without the forEveryTable thing
  if (tr.length > 0) {
    target.dispatch(...tr)
    return true
  } else {
    return false
  }
}

/**
 * Adds a table row before the one with the cursor.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has changed anything.
 */
export function addRowBefore (target: EditorView): boolean {
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    // TODO: Iterate over all ranges (but only once per row)
    const focusRange = ctx.ranges[0]
    const nLines = target.state.doc.lines
    const firstLine = target.state.doc.lineAt(ctx.tableNode.from)
    let thisLine = target.state.doc.lineAt(focusRange.head)
    if (ctx.tableAST.tableType === 'pipe') {
      // Can only add rows in the table body
      if (thisLine.number === firstLine.number) {
        return undefined
      }

      // Did the user select the divider? If so, move thisLine one below so that
      // the following checks correctly add rows.
      if (isPipeTableDelimRow(thisLine.text) && thisLine.number < nLines) {
        thisLine = target.state.doc.line(thisLine.number + 1)
      } else if (isPipeTableDelimRow(thisLine.text)) {
        return undefined // Seems like a malformed table that ends with the delim
      }

      return {
        // Keep the cursor which will end up at the correct position
        selection: { anchor: focusRange.anchor, head: focusRange.head },
        changes: {
          from: thisLine.from,
          insert: thisLine.text.replace(/[^\s\|]/g, ' ') + '\n'
        }
      }
    } else {
      // Grid table
      // The user may have the cursor in a divider or a content row
      if (isGridTableDelimRow(thisLine.text)) {
        return undefined
      }
      const nextLine = target.state.doc.line(thisLine.number + 1)
      return {
        changes: {
          from: thisLine.from,
          insert: thisLine.text.replace(/[^\s|+=]/g, ' ') + '\n' + nextLine.text + '\n'
        }
      }
    }
  })

  // What we should do here (and in addRowBefore) is stupidly simple: Just take
  // the current row (grid tables = this + next one), remove every character between
  // the pipes and put it after the row. Maybe even works without the forEveryTable thing
  if (tr.length > 0) {
    target.dispatch(...tr)
    return true
  } else {
    return false
  }
}

/**
 * Deletes an entire row from a table.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has changed anything.
 */
export function deleteRow (target: EditorView): boolean {
  // Deleting a row is really boring: Simply replace the current line with nothing
  const tr = mapSelectionsWithTables<TransactionSpec[]>(target, ctx => {
    const idx = getRowIndicesByRanges(ctx.ranges, ctx.offsets.outer)
    return idx.map(rowIdx => {
      const line = target.state.doc.lineAt(ctx.tableAST.rows[rowIdx].from)
      const isLastLine = line.number === target.state.doc.lines
      if (ctx.tableAST.tableType === 'pipe') {
        // Did the user select the divider? The second check is necessary as the
        // regex also matches empty lines
        if (isPipeTableDelimRow(line.text)) {
          return undefined
        }

        const changes = [{
          from: line.from, to: isLastLine ? line.to : line.to + 1, insert: ''
        }]

        if (rowIdx < ctx.tableAST.rows.length - 1) {
          // Check if the user just deleted the header row. In that case, we
          // need to swap the delim row with the next one.
          const nextLine = target.state.doc.line(line.number + 1) // The delimiter would not be in the AST
          if (isPipeTableDelimRow(nextLine.text)) {
            const thirdLine = target.state.doc.line(line.number + 2)
            changes.push(
              { from: nextLine.from, to: nextLine.to + 1, insert: '' },
              { from: thirdLine.to + 1, to: thirdLine.to + 1, insert: nextLine.text + '\n' }
            )
          }
        }
  
        return { changes }
      } else {
        // Grid table
        // The user may have the cursor in a divider or a content row
        if (isGridTableDelimRow(line.text)) {
          return undefined
        }
        const nextLine = target.state.doc.line(line.number + 1)
        const isNextLineLastLine = nextLine.number === target.state.doc.lines
        return {
          changes: {
            from: line.from, to: isNextLineLastLine ? nextLine.to : nextLine.to + 1, insert: ''
          }
        }
      }
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
 * Clears an entire table row out.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has changed anything
 */
export function clearRow (target: EditorView): boolean {
  // Clearing a row is even simpler, by simply replacing a row cell's contents with whitespace
  const changes = mapSelectionsWithTables(target, ctx => {
    const rows = getRowIndicesByRanges(ctx.ranges, ctx.offsets.outer)

    return rows.flatMap(row => {
      return ctx.offsets.outer[row].map(([ from, to ]) => {
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
