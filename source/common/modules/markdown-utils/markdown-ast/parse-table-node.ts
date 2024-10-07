/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseTableNode
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Since table node parsing is very complex as the
 *                  corresponding lezer parser is intentionally "dumb" (likely
 *                  to increase parser speed), parsing tables requires a lot of
 *                  code which is why this function has been externalized.
 *
 *                  TODO: Fix the table parsing. The Markdown parser does
 *                  successfully detect most tables, but it's really bad at
 *                  properly marking delimiters, headers, and cells.
 *
 * END HEADER
 */

import { type SyntaxNode } from '@lezer/common'
import { type Table, type TableRow, type TableCell, type ASTNode, parseNode } from '../markdown-ast'

/**
 * Since we can't fully rely on the Lezer parser to properly give us table nodes
 * we have to manually parse the children of table cells. For this, this
 * function extracts all nodes within from/to (the table cell boundaries) and
 * returns parsed AST nodes for them that can be mounted onto the child array
 * of table cell nodes.
 *
 * @param   {SyntaxNode}  tableNode  The table node
 * @param   {number}      from       Table cell start
 * @param   {number}      to         Table cell end
 * @param   {string}      markdown   The Markdown source
 *
 * @return  {ASTNode[]}              The parsed array
 */
function parseTableCellNodes (tableNode: SyntaxNode, from: number, to: number, markdown: string): ASTNode[] {
  const nodes: SyntaxNode[] = []
  // Find all nodes within the table cell; we want the top-most ones.
  let idx = from
  while (idx < to) {
    const node = tableNode.resolve(idx, 1)
    if (node.from > to) {
      break
    } else {
      nodes.push(node)
      idx = node.to
    }
  }
  return nodes.map(n => parseNode(n, markdown))
}

/**
 * Creates a new table cell node
 *
 * @param   {SyntaxNode}  tableNode  The outer table node
 * @param   {number}      from       Cell contents start
 * @param   {number}      to         Cell contents end
 * @param   {string}      markdown   The full Markdown content (entire document)
 *
 * @return  {TableCell}              The parsed cell
 */
function makeTableCell (tableNode: SyntaxNode, from: number, to: number, markdown: string): TableCell {
  const cell: TableCell = {
    type: 'TableCell',
    name: 'TableCell',
    from,
    to,
    whitespaceBefore: '',
    children: parseTableCellNodes(tableNode, from, to, markdown),
    textContent: markdown.slice(from, to).trim()
  }

  return cell
}

/**
 * Parses a SyntaxNode of name "Table". NOTE: Although the parser recognizes
 * grid tables, these are not officially implemented, and as such will cause
 * issues.
 *
 * @param   {SyntaxNode}  node      The node to parse
 * @param   {string}      markdown  The original Markdown source
 *
 * @return  {Table}                 The parsed Table AST node
 */
export function parseTableNode (node: SyntaxNode, markdown: string): Table {
  const astNode: Table = {
    type: 'Table',
    name: 'Table',
    from: node.from,
    to: node.to,
    whitespaceBefore: '', // Must be ''
    rows: []
  }

  const tableSource = markdown.substring(node.from, node.to)
  // Extract all lines including their offsets
  const tableLines: [ number, string ][] = tableSource.split('\n')
    .map((text, idx, arr) => {
      const offset = arr.slice(0, idx).reduce((off, t) => off + t.length + 1, 0)
      return [ offset, text ]
    })

  const globalOffset = node.from

  for (const [ lineOffset, line ] of tableLines) {
    if (/^[+-]+$/.test(line)) {
      // The line is a simple separator for grid tables -> do nothing
      continue
    } else if ((/^[|:-]+$/.test(line) && line.includes('-')) || /^[+=:]+$/.test(line)) {
      // The line is a header
      const tt = line.includes('-') ? 'pipe' : 'grid'
      astNode.tableType = tt
      // The plus indicates either a grid table or a special type of pipe table
      // produced by Emacs' orgtbl command
      // (cf. https://pandoc.org/MANUAL.html#extension-pipe_tables)
      astNode.alignment = (tt === 'grid' ? line.split('+') : line.split('|'))
        // NOTE: |-|-| will result in ['', '-', '-', ''] -> filter out
        .filter(c => c.length > 0)
        .map(c => {
          // Pipes at the beginning or end are possible with the Emacs tables
          // --> remove
          if (c.startsWith('|')) {
            c = c.substring(1)
          }
          if (c.endsWith('|')) {
            c = c.substring(0, c.length - 1)
          }
          // Now extract the alignment characters
          if (c.startsWith(':') && c.endsWith(':')) {
            return 'center'
          } else if (c.endsWith(':')) {
            return 'right'
          } else {
            return 'left'
          }
        })
    } else {
      // Regular line -> extract all cells.
      // The regular expression matches cell contents without the separating
      // pipe characters, and excludes leading and trailing whitespace. Group
      // 1 = leading whitespace, group 2 = the cell's contents.
      const cells = [...line.matchAll(/(?<=\|)(\s*)(.+?)\s*(?=\|)/g)]
        .map(match => {
          const localOffset = globalOffset + lineOffset
          const cellFrom = localOffset + match.index + match[1].length
          const cellTo = cellFrom + match[2].length
          return makeTableCell(node, cellFrom, cellTo, markdown)
        })

      const row: TableRow = {
        type: 'TableRow',
        name: 'tr',
        from: globalOffset + lineOffset,
        to: globalOffset + lineOffset + line.length,
        cells,
        isHeaderOrFooter: false, // TODO
        whitespaceBefore: ''
      }

      astNode.rows.push(row)
    }
  }

  return astNode
}
