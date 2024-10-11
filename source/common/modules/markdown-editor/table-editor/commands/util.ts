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

import { syntaxTree } from "@codemirror/language"
import { SelectionRange } from "@codemirror/state"
import { EditorView } from "@codemirror/view"
import { SyntaxNode } from "@lezer/common"
import { parseTableNode } from "@common/modules/markdown-utils/markdown-ast/parse-table-node"

/**
 * Takes a table node and the corresponding Markdown source and returns a list
 * of the cell offsets (from, to) for every cell in the table, sorted by rows.
 * The structure of the return value is `[rows][cells][from, to]`.
 *
 * @param   {SyntaxNode}  tableNode  The table SyntaxNode
 * @param   {string}      markdown   The original Markdown source
 *
 * @return  {[number, number][][]}   The [from, to] offsets of all Table cells
 */
export function getTableCellOffsets (tableNode: SyntaxNode, markdown: string): [number, number][][] {
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
export function mapSelectionsWithTables<T> (
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
