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
import type { ChangeSpec } from '@codemirror/state'
import type { SyntaxNode } from '@lezer/common'

/**
 * Utility function that will return a CodeMirror command based on the `which`
 * argument that then applies the provided alignment to the corresponding table
 * column in which the selection resides.
 *
 * @param   {'left'|'right'|'center'}  which  Which alignment this should apply
 *
 * @return  {(EditorView): boolean}           A CodeMirror compatible command function
 */
export function setAlignment (which: 'left'|'right'|'center'): (target: EditorView) => boolean {
  return (target) => {
    const changes = mapSelectionsWithTables<ChangeSpec>(target, (range, tableNode, tableAST, offsets) => {
      const delimNodes = tableNode.getChildren('TableDelimiter')
      let node: SyntaxNode|undefined = delimNodes[0]
      if (delimNodes.length > 1) {
        node = delimNodes.find(node => target.state.sliceDoc(node.from, node.to).includes('='))
      }
  
      if (node === undefined) {
        return undefined
      }
  
      const delimLine = target.state.sliceDoc(node.from, node.to)
  
      const idx = findColumnIndexByRange(range, offsets.outer)
  
      if (idx === undefined) {
        return undefined
      }
  
      const delimChar = tableAST.tableType === 'grid' ? '+' : delimLine.includes('|') ? '|' : '+'
      const fillChar = tableAST.tableType === 'grid' ? '=' : '-'
      const delimOffsets = getDelimiterLineCellOffsets(delimLine, delimChar)
      const [ from, to ] = delimOffsets[idx]
      if (which === 'left') {
        return { from: node.from + from, to: node.from + to, insert: fillChar.repeat(to - from) }
      } else if (which === 'right') {
        return { from: node.from + from, to: node.from + to, insert: fillChar.repeat(to - from - 1) + ':' }
      } else {
        return { from: node.from + from, to: node.from + to, insert: ':' + fillChar.repeat(to - from - 2) + ':' }
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
  const changes = mapSelectionsWithTables<ChangeSpec[]>(target, (range, tableNode, tableAST, offsets) => {
    // Map over the offset rows, and then simply yield changes that replace each
    // table cell with whitespace, flattening the array
    return offsets.outer.flatMap(row => row.map(([ from, to ]) => ({ from, to, insert: ' '.repeat(to - from) })))
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
