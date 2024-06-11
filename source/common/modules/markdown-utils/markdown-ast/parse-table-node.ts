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

  // The parser cannot reliably extract the table delimiters, but we need
  // those for the column alignment. Thus, we need to see if we can find the
  // header row (pipe tables) or a delimiter row (grid tables) in order to
  // determine the column alignments.
  for (const line of markdown.substring(node.from, node.to).split('\n')) {
    if (!/^[|+:-]+$/.test(line)) {
      continue
    }

    // Gotcha.
    if (line.includes('|')) {
      astNode.tableType = 'pipe'
    } else {
      astNode.tableType = 'grid'
    }

    // The plus indicates a special Pandoc-type of pipe table
    const splitter = line.includes('+') ? '+' : '|'
    astNode.alignment = line.split(splitter)
      // NOTE: |-|-| will result in ['', '-', '-', ''] -> filter out
      .filter(c => c.length > 0)
      .map(c => {
        if (c.startsWith('|')) {
          c = c.substring(1)
        }
        if (c.endsWith('|')) {
          c = c.substring(0, c.length - 1)
        }
        if (c.startsWith(':') && c.endsWith(':')) {
          return 'center'
        } else if (c.endsWith(':')) {
          return 'right'
        } else {
          return 'left'
        }
      })
    break
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
    // empty cells, so we cannot fully rely on the existence of table cells. See:
    // https://github.com/lezer-parser/markdown/issues/23
    // Thus, we have to manually move through the line one by one. If a
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
          ]
        }
        rowNode.cells.push(cellNode)
        wasDelim = false
      } else if (next.name === 'TableCell') {
        // Functional table cell
        const cellNode: TableCell = {
          type: 'TableCell',
          name: 'TableCell',
          from: next.from,
          to: next.to,
          whitespaceBefore: '',
          children: []
        }
        parseChildren(cellNode, next, markdown)
        rowNode.cells.push(cellNode)
        wasDelim = false
      } else {
        console.warn(`Could not fully parse Table node: Unexpected node "${next.name}" in row.`)
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
