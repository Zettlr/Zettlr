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
import { findColumnIndexByRange, getDelimiterLineCellOffsets, mapSelectionsWithTables } from './util'
import type { ChangeSpec, TransactionSpec } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'

/**
 * Utility function that will return a CodeMirror command based on the `which`
 * argument that then applies the provided alignment to the corresponding table
 * column in which the selection resides.
 *
 * @param   {'left'|'right'|'center'}  alignTo  Which alignment this should apply
 *
 * @return  {(EditorView): boolean}             A CodeMirror compatible command function
 */
export function setAlignment (alignTo?: 'left'|'right'|'center'): (target: EditorView) => boolean {
  return (target) => {
    const changes = mapSelectionsWithTables<ChangeSpec>(target, ctx => {
      const delimNodes = ctx.tableNode.getChildren('TableDelimiter')
      let node: SyntaxNode|undefined = delimNodes[0]
      if (delimNodes.length > 1) {
        node = delimNodes.find(node => target.state.sliceDoc(node.from, node.to).includes('='))
      }

      if (node === undefined) {
        return undefined
      }

      const delimLine = target.state.sliceDoc(node.from, node.to)

      // TODO: Iterate over all ranges (but only once per row)
      const idx = findColumnIndexByRange(ctx.ranges[0], ctx.offsets.outer)

      if (idx === undefined) {
        return undefined
      }

      const delimChar = ctx.tableAST.tableType === 'grid' ? '+' : delimLine.includes('|') ? '|' : '+'
      const fillChar = ctx.tableAST.tableType === 'grid' ? '=' : '-'
      const delimOffsets = getDelimiterLineCellOffsets(delimLine, delimChar)
      const [ from, to ] = delimOffsets[idx]
      // ensure that each delimiter contains at least 3 characters
      switch (alignTo) {
        case 'left':
          return { from: node.from + from, to: node.from + to, insert: ':' + fillChar.repeat(Math.max(to - from - 1, 2)) }
        case 'right':
          return { from: node.from + from, to: node.from + to, insert: fillChar.repeat(Math.max(to - from - 1, 2)) + ':' }
        case 'center':
          return { from: node.from + from, to: node.from + to, insert: ':' + fillChar.repeat(Math.max(to - from - 2, 1)) + ':' }
        default:
          return { from: node.from + from, to: node.from + to, insert: fillChar.repeat(Math.max(to - from, 3)) }
      }
    })

    if (changes.length > 0) {
      target.dispatch({ changes })
      return true
    } else {
      return false
    }
  }
}

/**
 * Clears all tables with selections inside them.
 *
 * @param   {EditorView}  target  The target EditorView
 *
 * @return  {boolean}             Whether the command has applied any changes.
 */
export function clearTable (target: EditorView): boolean {
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, ctx => {
    // Map over the offset rows, and then simply yield changes that replace each
    // table cell with whitespace, flattening the array
    return ctx.offsets.outer.flatMap(row => row.map(([ from, to ]) => ({ from, to, insert: ' '.repeat(to - from) })))
  }).flat() // Flatten the corresponding array

  if (changes.length > 0) {
    target.dispatch({ changes })
    return true
  } else {
    return false
  }
}

// Utility/Helper function that adds appropriate spacing
export function alignTables (target: EditorView, pos?: number): boolean {
  const tr = mapSelectionsWithTables<TransactionSpec>(target, ctx => {
    if (pos !== undefined && (pos < ctx.tableAST.from || pos > ctx.tableAST.to)) {
      return
    }

    const cellContents = ctx.tableAST.rows.map(row => {
      return row.cells.map(cell => target.state.sliceDoc(cell.from, cell.to).trim())
    })

    const cellSizes = cellContents.map(row => {
      return row.map(cell => cell.length)
    })

    const targetColumnSizes = []
    for (let i = 0; i < cellSizes[0].length; i++) {
      targetColumnSizes.push(Math.max(...cellSizes.map(row => row[i])) + 2)
    }

    const newContents: string[][] = []
    for (let i = 0; i < cellContents.length; i++) {
      newContents.push([])
      for (let j = 0; j < cellContents[0].length; j++) {
        const cell = cellContents[i][j]
        const pad = targetColumnSizes[j] - cell.length
        switch (ctx.tableAST.alignment[j]) {
          case 'left':
            newContents[i].push(' ' + cell.padEnd(targetColumnSizes[j] - 1, ' '))
            break
          case 'right':
            newContents[i].push(cell.padStart(targetColumnSizes[j] - 1, ' ') + ' ')
            break
          case 'center':
            newContents[i].push(' '.repeat(Math.floor(pad/2)) + cell + ' '.repeat(Math.ceil(pad/2)))
            break
          default:
            newContents[i].push(' ')
            break
        }
      }
    }

    const delimRow: string[] = []
    for (let i = 0; i < ctx.tableAST.alignment.length; i++) {
      const size = targetColumnSizes[i]
      // ensure that each delimiter contains at least 3 characters
      switch (ctx.tableAST.alignment[i]) {
        case 'left':
          delimRow.push(':' + '-'.repeat(Math.max(size - 1, 2)))
          break
        case 'right':
          delimRow.push('-'.repeat(Math.max(size - 1, 2)) + ':')
          break
        case 'center':
          delimRow.push(':' + '-'.repeat(Math.max(size - 2, 1)) + ':')
          break
        default:
          delimRow.push('-'.repeat(Math.max(size, 3)))
      }
    }

    const newRows = newContents.map(row => '|' + row.join('|') + '|')
    newRows.splice(1, 0, '|' + delimRow.join('|') + '|')

    return {
      changes: {
        from: ctx.tableAST.from, to: ctx.tableAST.to,
        insert: newRows.join('\n')
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
