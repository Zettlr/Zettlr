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
import { isPipeTableDelimRow, mapSelectionsWithTables } from './util'

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
      const rowIndex = ctx.offsets.outer.findIndex(cellOffsets => {
        return cellOffsets.some(off => off[0] <= range.anchor && off[1] >= range.anchor)
      })
  
      if (rowIndex < 0 || rowIndex === ctx.offsets.outer.length - 1) {
        return undefined
      } else {
        const row = ctx.offsets.outer[rowIndex]
        const cellIndex = row.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)
        if (cellIndex < 0) {
          return undefined
        }
  
        // NOTE that we move by the inner offsets here
        return EditorSelection.cursor(ctx.offsets.inner[rowIndex + 1][cellIndex][0])
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
      const rowIndex = ctx.offsets.outer.findIndex(cellOffsets => {
        return cellOffsets.some(off => off[0] <= range.anchor && off[1] >= range.anchor)
      })
  
      if (rowIndex <= 0) {
        return undefined
      } else {
        const row = ctx.offsets.outer[rowIndex]
        const cellIndex = row.findIndex(off => off[0] <= range.anchor && off[1] >= range.anchor)
        if (cellIndex < 0) {
          return undefined
        }
  
        // NOTE that we move by the inner offsets
        return EditorSelection.cursor(ctx.offsets.inner[rowIndex - 1][cellIndex][0])
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
 * For any selection ranges within a table, this function swaps the anchor's row
 * with the next one if applicable, accounting for table type and header rows.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether any swaps have happened.
 */
export function swapNextRow (target: EditorView): boolean {
  const changes: ChangeSpec[] = mapSelectionsWithTables(target, ctx => {
    // TODO: What if selection spans multiple rows? The user then clearly
    // intends to move them all together
    // TODO: Iterate over all ranges (but only once per row)
    const thisLine = target.state.doc.lineAt(ctx.ranges[0].anchor)
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
  const changes = mapSelectionsWithTables(target, ctx => {
    // TODO: What if selection spans multiple rows? The user then clearly
    // intends to move them all together
    // TODO: Iterate over all ranges (but only once per row)
    const thisLine = target.state.doc.lineAt(ctx.ranges[0].anchor)
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

/**
 * Adds a row to a table after the one the cursor is in.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has changed anything
 */
export function addRowAfter (target: EditorView): boolean {
  const changes = mapSelectionsWithTables(target, ctx => {
    // TODO: Iterate over all ranges (but only once per row)
    const line = target.state.doc.lineAt(ctx.ranges[0].head)
    if (ctx.tableAST.tableType === 'pipe') {
      // Did the user select the divider? The second check is necessary as the
      // regex also matches empty lines
      if (isPipeTableDelimRow(line.text)) {
        return undefined
      }

      const nextLine = line.number < target.state.doc.lines ? target.state.doc.line(line.number + 1) : undefined
      if (nextLine !== undefined && isPipeTableDelimRow(nextLine.text)) {
        return undefined // Only one row in the header allowed
      }

      return {
        from: line.number === target.state.doc.lines ? line.to : line.to + 1,
        insert: line.text.replace(/[^\s\|]/g, ' ') + '\n'
      }
    } else {
      // Grid table
      // The user may have the cursor in a divider or a content row
      if (/^[\s+=:-]+$/.test(line.text)) {
        return undefined
      }
      const nextLine = target.state.doc.line(line.number + 1)
      return {
        from: nextLine.number === target.state.doc.lines ? nextLine.to : nextLine.to + 1,
        insert: line.text.replace(/[^\s|+=]/g, ' ') + '\n' + nextLine.text + '\n'
      }
    }
  })

  // What we should do here (and in addRowBefore) is stupidly simple: Just take
  // the current row (grid tables = this + next one), remove every character between
  // the pipes and put it after the row. Maybe even works without the forEveryTable thing
  if (changes.length > 0) {
    target.dispatch({ changes })
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
  const changes = mapSelectionsWithTables(target, ctx => {
    // TODO: Iterate over all ranges (but only once per row)
    const line = target.state.doc.lineAt(ctx.ranges[0].head)
    if (ctx.tableAST.tableType === 'pipe') {
      // Did the user select the divider? The second check is necessary as the
      // regex also matches empty lines
      if (isPipeTableDelimRow(line.text)) {
        return undefined
      }

      return {
        from: line.from,
        insert: line.text.replace(/[^\s\|]/g, ' ') + '\n'
      }
    } else {
      // Grid table
      // The user may have the cursor in a divider or a content row
      if (/^[\s+=:-]+$/.test(line.text)) {
        return undefined
      }
      const nextLine = target.state.doc.line(line.number + 1)
      return {
        from: line.from,
        insert: line.text.replace(/[^\s|+=]/g, ' ') + '\n' + nextLine.text + '\n'
      }
    }
  })

  // What we should do here (and in addRowBefore) is stupidly simple: Just take
  // the current row (grid tables = this + next one), remove every character between
  // the pipes and put it after the row. Maybe even works without the forEveryTable thing
  if (changes.length > 0) {
    target.dispatch({ changes })
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
  const changes = mapSelectionsWithTables(target, ctx => {
    // TODO: Iterate over all ranges (but only once per row)
    const line = target.state.doc.lineAt(ctx.ranges[0].head)
    if (ctx.tableAST.tableType === 'pipe') {
      // Did the user select the divider? The second check is necessary as the
      // regex also matches empty lines
      if (isPipeTableDelimRow(line.text)) {
        return undefined
      }

      return {
        from: line.from,
        to: line.to === target.state.doc.length ? line.to : line.to + 1,
        insert: ''
      }
    } else {
      // Grid table
      // The user may have the cursor in a divider or a content row
      if (/^[\s+=:-]+$/.test(line.text)) {
        return undefined
      }
      const nextLine = target.state.doc.line(line.number + 1)
      return {
        from: line.from,
        to: nextLine.to === target.state.doc.length ? nextLine.to : nextLine.to + 1,
        insert: ''
      }
    }
  })

  if (changes.length > 0) {
    target.dispatch({ changes })
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
    // TODO: Iterate over all ranges (but only once per row)
    const row = ctx.offsets.outer.find(row => {
      const cells = row.flat().sort((a, b) => a - b)
      return ctx.ranges[0].head >= cells[0] && ctx.ranges[0].head <= cells[cells.length - 1]
    })

    if (row === undefined) {
      return undefined
    }

    return row.map(([ from, to ]) => {
      return { from, to, insert: ' '.repeat(to - from) }
    })
  })

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

