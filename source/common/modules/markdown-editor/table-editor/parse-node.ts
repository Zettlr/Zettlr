/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseNode
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a utility function to parse a TableEditor
 *                  compatible AST from a Lezer SyntaxNode of type Table
 *
 * END HEADER
 */

import type { SyntaxNode } from '@lezer/common'
import type { ParsedTable } from './types'
import { parseNode as parse } from 'source/common/modules/markdown-utils/markdown-ast'

/**
 * Parses a syntax node of type "Table" into an AST & column alignments ready
 * for a TableEditor instance.
 *
 * @param   {SyntaxNode}   tableNode  The table node
 * @param   {string}       markdown   The full Markdown source to read the
 *                                    contents from
 *
 * @return  {ParsedTable}             The parsed AST.
 */
export function parseNode (tableNode: SyntaxNode, markdown: string): ParsedTable {
  const ast = parse(tableNode, markdown)
  if (ast.type !== 'Table') {
    throw new Error(`Cannot instantiate TableEditor: Node was ${ast.type}, not "Table".`)
  }

  const tableEditorAst = ast.rows.map(row => row.cells.map(cell => markdown.substring(cell.from, cell.to).trim()))

  if (tableEditorAst.length === 0) {
    throw new Error('Cannot instantiate TableEditor: Table had zero rows.')
  }

  return {
    ast: tableEditorAst,
    type: ast.tableType,
    colAlignments: ast.alignment ?? tableEditorAst[0].map(_cell => 'left')
  }
}
