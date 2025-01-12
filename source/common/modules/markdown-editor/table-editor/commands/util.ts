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
import { parseTableNode } from '@common/modules/markdown-utils/markdown-ast/parse-table-node'

/**
 * Takes a table node and the corresponding Markdown source and returns a list
 * of the cell offsets (from, to) for every cell in the table, sorted by rows.
 * The structure of the return value is `[rows][cells][from, to]`.
 *
 * @param   {SyntaxNode}  tableNode           The table SyntaxNode
 * @param   {string}      markdown            The original Markdown source
 *
 * @return  {[number, number][][]|undefined}  The [from, to] offsets of all
 *                                            Table cells. Returns undefined if
 *                                            the AST parser could not properly
 *                                            parse the table.
 */
export function getTableCellOffsets (tableNode: SyntaxNode, markdown: string): [number, number][][]|undefined {
  const ast = parseTableNode(tableNode, markdown)
  if (ast.type !== 'Table') {
    return undefined
  }

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
export function mapSelectionsWithTables<T> (
  target: EditorView,
  callback: (
    range: SelectionRange,
    table: SyntaxNode,
    // NOTE: Exclude<> takes a type and removes whatever comes afterward from it.
    // This means: We have to check for that, but it makes implementing callbacks
    // simpler.
    offsets: Exclude<ReturnType<typeof getTableCellOffsets>, undefined>
  ) => T|undefined
): T[] {
  // TODO: Is not recursive! Need to iter!
  const tableNodes = syntaxTree(target.state).topNode.getChildren('Table')

  return target.state.selection.ranges.map(range => {
    const table = tableNodes.find(node => node.from <= range.anchor && node.to >= range.anchor)
    if (table === undefined) {
      return undefined
    }

    // The AST parser may spit out a TextNode instead of a Table if there was
    // something going on with the SyntaxNode. This means that table offsets
    // aren't guaranteed for any Table node. Here we account for that fact.
    const offsets = getTableCellOffsets(table, target.state.sliceDoc())
    return offsets !== undefined ? callback(range, table, offsets) : undefined
  })
    .filter(sel => sel !== undefined) // Filter out undefineds
}
