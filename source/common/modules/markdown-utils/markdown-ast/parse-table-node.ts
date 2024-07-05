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
 * END HEADER
 */

import { type SyntaxNode } from '@lezer/common'
import type { Table, TableRow, TableCell } from '../markdown-ast'
import { getWhitespaceBeforeNode } from './get-whitespace-before-node'
import { parseChildren } from './parse-children'
import { genericTextNode } from './generic-text-node'

/**
 * Parses a SyntaxNode of name "Table"
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
    whitespaceBefore: getWhitespaceBeforeNode(node, markdown),
    rows: []
  }

  const header = node.getChildren('TableHeader')
  const rows = node.getChildren('TableRow')
  const tableSource = markdown.substring(node.from, node.to)
  const tableLines = tableSource.split('\n')

  // The parser cannot reliably extract the table heading indicator row, but we
  // need it for the column alignment. Thus, we need to see if we can find the
  // delimiter row in order to determine the column alignments.
  const headerRow = tableLines.find(line => /^[|+:-]+$/.test(line))

  if (headerRow !== undefined) {
    // Also note down the table type
    astNode.tableType = headerRow.includes('|') ? 'pipe' : 'grid'
    // The plus indicates either a grid table or a special type of pipe table
    // produced by Emacs' orgtbl command
    // (cf. https://pandoc.org/MANUAL.html#extension-pipe_tables)
    const splitter = headerRow.includes('+') ? '+' : '|'

    astNode.alignment = headerRow.split(splitter)
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
  } // Else: Couldn't determine either column alignment nor table type

  // Now, transform the rows.
  for (const row of [ ...header, ...rows ]) {
    const rowNode: TableRow = {
      type: 'TableRow',
      name: row.name,
      from: row.from,
      to: row.to,
      whitespaceBefore: '',
      isHeaderOrFooter: row.name === 'TableHeader',
      cells: []
    }

    // NOTE: The Lezer parser intentionally does not emit TableCell nodes for
    // empty cells, so we cannot fully rely on the existence of table cells.
    // See: https://github.com/lezer-parser/markdown/issues/23
    // Thus, we have to manually move through the lines one by one. If a
    // TableDelimiter is followed by another TableDelimiter, we know that there
    // is an empty cell in between.
    let next = row.firstChild
    let wasDelim = false
    while (next !== null) {
      if (next.name === 'TableDelimiter' && !wasDelim) {
        wasDelim = true
      } else if (next.name === 'TableDelimiter' && wasDelim) {
        // Last iteration was a TableDelimiter, and now again --> Empty cell
        const prev = next.prevSibling!
        const cellNode: TableCell = {
          type: 'TableCell',
          name: 'TableCell',
          from: prev.to,
          to: next.from,
          whitespaceBefore: '',
          // Has no real children; here we basically just account for any whitespace
          children: [
            genericTextNode(prev.to, next.from, markdown.slice(prev.to, next.from))
          ],
          textContent: markdown.slice(prev.to, next.from)
        }
        rowNode.cells.push(cellNode)
      } else if (next.name === 'TableCell') {
        // Functional table cell
        const cellNode: TableCell = {
          type: 'TableCell',
          name: 'TableCell',
          from: next.from,
          to: next.to,
          whitespaceBefore: '',
          children: [],
          textContent: markdown.slice(next.from, next.to)
        }
        parseChildren(cellNode, next, markdown)
        rowNode.cells.push(cellNode)
        wasDelim = false
      } else {
        // TODO: There are frequent TableHeader warnings printed to the console.
        console.warn(`Could not fully parse Table node: Unexpected node "${next.name}" in row (text content: "${markdown.slice(next.from, next.to)}").`)
        wasDelim = false
      }
      next = next.nextSibling
    }

    // Special case handling: The Lezer parser unfortunately is a bit sloppy
    // when it comes to grid table parsing and often includes the delimiting
    // pipes between cells as part of the TableCell nodes. Here we account for
    // that and remove that pipe if applicable.
    for (const cellNode of rowNode.cells) {
      if (
        astNode.tableType === 'grid' && cellNode.children.length > 0 &&
        cellNode.children[0].type === 'Text' && cellNode.children[0].value.startsWith('|')
      ) {
        cellNode.children[0].value = cellNode.children[0].value.substring(1)
        cellNode.children[0].from += 1
        cellNode.from += 1
      }
    }
    astNode.rows.push(rowNode)
  }
  return astNode
}
