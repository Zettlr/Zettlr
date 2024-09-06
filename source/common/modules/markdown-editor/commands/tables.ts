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
 * Attempts to move all cursors/selections to the next cell. NOTE: This command
 * looks at the selection anchors, not the heads, to determine movement.
 *
 * @param   {EditorView}  target  The target view
 *
 * @return  {boolean}             Whether the command has moved any selections
 */
export function moveNextCell (target: EditorView): boolean {
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')
  const newSelections: SelectionRange[] = target.state.selection.ranges.map(range => {
    // 1. Is this selection inside a table?
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    const offsets = getTableCellOffsets(table, target.state.sliceDoc()).flat() // Remove the rows

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
    .filter(sel => sel !== undefined)

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
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')
  const newSelections: SelectionRange[] = target.state.selection.ranges.map(range => {
    // 1. Is this selection inside a table?
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    const offsets = getTableCellOffsets(table, target.state.sliceDoc()).flat() // Remove the rows

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
    .filter(sel => sel !== undefined)

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
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')
  const newSelections: SelectionRange[] = target.state.selection.ranges.map(range => {
    // 1. Is this selection inside a table?
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    const offsets = getTableCellOffsets(table, target.state.sliceDoc())
    console.log(offsets)

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
    .filter(sel => sel !== undefined)

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
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')
  const newSelections: SelectionRange[] = target.state.selection.ranges.map(range => {
    // 1. Is this selection inside a table?
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    const offsets = getTableCellOffsets(table, target.state.sliceDoc())

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
    .filter(sel => sel !== undefined)

  if (newSelections.length > 0) {
    target.dispatch({ selection: EditorSelection.create(newSelections) })
    return true
  } else {
    return false
  }
}

export function swapNextCol (target: EditorView): boolean {
  return false
}

export function swapPrevCol (target: EditorView): boolean {
  return false
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
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')
  const changes: ChangeSpec[] = []
  
  target.state.selection.ranges.map(range => {
    // TODO: What if selection spans multiple rows? The user then clearly intends
    // to move them all together
    // 1. Is this selection inside a table?
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    const tableAST = parseTableNode(table, target.state.sliceDoc())
    const thisLine = target.state.doc.lineAt(range.anchor)
    const lastLine = target.state.doc.lineAt(table.to)
    if (thisLine.number === target.state.doc.lines || thisLine.number === lastLine.number) {
      return undefined
    }

    console.log({ tableAST })
    if (tableAST.tableType === 'grid') {
      // Handle a grid table
      let nextLine = target.state.doc.line(thisLine.number + 2)
      if (nextLine.number > lastLine.number || nextLine.number >= target.state.doc.lines) {
        return undefined
      }
      console.log(thisLine.text, nextLine.text)
      changes.push(
        { from: thisLine.from, to: thisLine.to, insert: nextLine.text },
        { from: nextLine.from, to: nextLine.to, insert: thisLine.text }
      )
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
        changes.push(
          { from: thisLine.from, to: thisLine.to + 1, insert: '' },
          { from: nextLine.to, to: nextLine.to, insert: '\n' + thisLine.text }
        )
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

export function swapPrevRow (target: EditorView): boolean {
  return false
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

// Utility/Helper function that adds appropriate spacing
export function alignTable (/* TODO: Parameters */): void {
}
