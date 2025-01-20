/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Table commands (utility functions)
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
import type { SelectionRange } from '@codemirror/state'
import type { EditorView } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import type { Table } from 'source/common/modules/markdown-utils/markdown-ast'
import { parseTableNode } from 'source/common/modules/markdown-utils/markdown-ast/parse-table-node'

export interface TableCellOffsets {
  /**
   * The inner cell `[from, to]` offsets, indexed by row and cell.
   */
  inner: [number, number][][]
  /**
   * The outer cell `[from, to]` offsets, indexed by row and cell.
   */
  outer: [number, number][][]
}

/**
 * Takes a table node and the corresponding Markdown source and returns an
 * object with both the inner and outer list of cell offsets `[from, to]` for
 * every cell in the table, sorted by rows. Inner offsets refer to the offsets
 * of the cell's actual content (without padding whitespace), whereas the outer
 * offsets refer to the table cell's maximum extend up until the delimiting
 * characters. The structure of each list is `[rows][cells][from, to]`.
 *
 * @param   {Table}             tableAST  The table AST node
 *
 * @return  {TableCellOffsets}            The set of inner and outer cell offsets
 */
export function getTableCellOffsets (tableAST: Table): TableCellOffsets {
  return {
    inner: tableAST.rows.map(row => {
      return row.cells.map(cell => [ cell.from, cell.to ])
    }),
    outer: tableAST.rows.map(row => {
      return row.cells.map(cell => [ cell.padding.from, cell.padding.to ])
    })
  }
}

/**
 * Takes a SelectionRange and a list of cell offsets (produced, e.g., by
 * `getTableCellOffsets`), and returns the column index that corresponds to the
 * selection's head or anchor.
 *
 * @param   {SelectionRange}   range        The range
 * @param   {number[][]}       cellOffsets  The matrix of cell offsets
 * @param   {'head'|'anchor'}  where        The selection part that matters,
 *                                          defaults to `head`
 *
 * @return  {number|undefined}              The cell index (or undefined)
 */
export function findColumnIndexByRange (
  range: SelectionRange,
  cellOffsets: [number, number][][],
  where: 'head'|'anchor' = 'head'
): number|undefined {
  const cellIndex = cellOffsets.map(row => {
    return row.findIndex(cell => cell[0] <= range[where] && cell[1] >= range[where])
  })
    .filter(sel => sel > -1)

  // Now cellIndex should contain exactly one index
  if (cellIndex.length !== 1) {
    return undefined
  }

  return cellIndex[0]
}

/**
 * The equivalent function to `findColumnIndexByRange` for finding the table's
 * row index according to the selection range.
 *
 * @return  {number|undefined}  The row index, or undefined
 */
export function findRowIndexByRange (
  range: SelectionRange,
  cellOffsets: [number, number][][],
  where: 'head'|'anchor' = 'head'
): number|undefined {
  const rowIndex = cellOffsets.findIndex(row => {
    const offsets = row.flat()
    return range[where] >= Math.min(...offsets) && range[where] <= Math.max(...offsets)
  })

  return rowIndex < 0 ? undefined : rowIndex
}
/**
 * Utility function to extract the `[from, to]` offsets of the cells within a
 * header delimiting table row in a pipe table (e.g., `--|--|--`). NOTE: By
 * definition these are the *outer* margins of the cells.
 *
 * @param   {string}              line       The line text
 * @param   {string}              delimChar  The delimiter char (e.g., | or +)
 *
 * @return  {[number, number][]}             The offsets
 */
export function getDelimiterLineCellOffsets (line: string, delimChar: string): [number, number][] {
  const offsets: [number, number][] = []
  let from = 0
  for (let i = 0; i < line.length; i++) {
    // Ignore a leading pipe
    if (i === 0 && line[i] === delimChar) {
      from++
      continue
    }

    if (line[i] === delimChar) {
      offsets.push([ from, i ])
      from = i + 1
    }
  }

  if (from < line.length - 1) {
    offsets.push([ from, line.length - 1 ])
  }

  return offsets
}

/**
 * Helper function that makes implementing the table commands simpler by
 * centrally collecting the required logic. Will call `callback` for every
 * selection range contained in a `Table` node. The `callback` can return
 * anything, but usually something that can be turned into a transaction.
 * 
 * NOTEs:
 *
 * * `callback` can return `undefined` if a command doesn't apply to a selection
 *   and this command will already filter those out
 * * Each `callback` is guaranteed to receive a valid range, in a valid table
 *   with all arguments valid
 * * The `offsets` to receive can be controlled by the third optional parameter.
 *
 * @param   {EditorView}     target        The target EditorView on which to
 *                                         perform the operation.
 * @param   {Callable}       callback      The callback receives 4 arguments:
 *                                         * `range`: The SelectionRange
 *                                         * `tableNode`: The SyntaxNode
 *                                         * `tableAST`: The ASTNode
 *                                         * `offsets`: The Table's cell offsets
 *
 * @return  {T[]}                          Returns an array of whatever type the
 *                                         user callback returns.
 */
export function mapSelectionsWithTables<T> (
  target: EditorView,
  callback: (
    range: SelectionRange,
    tableNode: SyntaxNode,
    tableAST: Table,
    offsets: ReturnType<typeof getTableCellOffsets>
  ) => T|undefined
): T[] {
  // TODO: Is not recursive! Need to iter!
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')

  return target.state.selection.ranges.map(range => {
    const tableNode = tableNodes.find(node => node.from <= range.head && node.to >= range.head)
    if (tableNode === undefined) {
      return undefined
    }

    // The AST parser may spit out a TextNode instead of a Table if there was
    // something going on with the SyntaxNode. This means that table offsets
    // aren't guaranteed for any Table node. Here we account for that fact.
    const tableAST = parseTableNode(tableNode, target.state.sliceDoc())
    if (tableAST.type !== 'Table') {
      return undefined
    }
    const offsets = getTableCellOffsets(tableAST)
    return callback(range, tableNode, tableAST, offsets)
  })
    .filter(sel => sel !== undefined) // Filter out undefineds
}
