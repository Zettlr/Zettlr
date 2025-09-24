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

import type { SyntaxNode } from '@lezer/common'
import type { Table, TableRow, TableCell, TextNode } from '../markdown-ast'
import { genericTextNode } from './generic-text-node'
import { parseChildren } from './parse-children'

/**
 * Parses a SyntaxNode of name "Table". NOTE the following caveats:
 *
 * * The parser can be a bit sloppy, and the AST parser attempts to always
 *   construct a valid table. If that isn't possible, a generic text node will
 *   be returned.
 * * Some rows in the table node may have incorrect numbers of cells. We leave
 *   this to the caller to deal with (i.e., impute missing cells or "throw away"
 *   superfluous ones, or even add new cells to all other rows).
 *
 * @param   {SyntaxNode}      node      The node to parse
 * @param   {string}          markdown  The original Markdown source
 *
 * @return  {Table|TextNode}            The parsed Table AST node. If the parser
 *                                      could not parse the table, a TextNode is
 *                                      returned instead.
 */
export function parseTableNode (node: SyntaxNode, markdown: string): Table|TextNode {
  // logLezerTree(node, { markdown, logNodes: true })
  // A few NOTEs on how the Lezer parser handles Markdown tables.
  // 1. It only supports GFM tables, i.e., pipe tables. Marijn has implemented
  //    this spec: https://github.github.com/gfm/#tables-extension-
  // 2. The header row has node name "TableHeader"
  // 3. The delimiting row (required) is a "TableDelimiter" and sibling of
  //    "TableHeader" and "TableRows"
  // 4. All "TableDelimiter" that are not the delimiting row are children of
  //    "TableHeader" or "TableRows"
  // 5. Empty cells are not mounted using a "TableCell"
  // 6. Tables where one row has too many columns are not mounted as Table nodes
  // 7. Tables containing ambiguous rows may be mounted with no TableHeader, and
  //    the delimiting row is a child of a TableRow
  // 8. Rows with too few columns will still be detected, but then have too few
  //    TableCell/TableDelimiter nodes
  // 9. Our parser ALSO supports Grid tables. These can have logical rows that
  //    consist of multiple lines. The AST-parser needs to allow those, too.

  // ===========================================================================

  // To properly convert a "Table" SyntaxNode into a Table ASTNode, we need to
  // proceed methodically.

  // 1. We determine the correct number of columns by looking at the
  //    TableDelimiter node that is a direct child of the Table node. If there
  //    is none, we return a generic Text Node (an error w/o losing information)
  const delimitingRow = node.getChild('TableDelimiter')
  if (delimitingRow === null) {
    // TODO: Right now, this line will trigger for grid tables (I literally
    // forgot that I implemented a parser for that).
    console.warn('Could not parse Table: Could not find a delimiting row. This can be caused by ambiguous table markup.')
    // logLezerTree(node)
    // console.log(markdown.slice(node.from, node.to))
    return genericTextNode(node.from, node.to, markdown.slice(node.from, node.to))
  }

  const astNode: Table = {
    type: 'Table',
    name: 'Table',
    // Pipe tables must start with the header row while grid tables start with a
    // delimiter -> here we can distinguish them.
    tableType: node.firstChild?.name === 'TableDelimiter' ? 'grid' : 'pipe',
    from: node.from,
    to: node.to,
    whitespaceBefore: '',
    alignment: [],
    rows: [],
    attributes: {}
  }

  // TODO: Create two sub-functions; one which does the same as below to parse
  // pipe tables, and one that parses grid tables.

  // 2. We detect both the number of columns as well as the alignment using the
  //    delimiter row
  astNode.alignment = markdown
    .slice(delimitingRow.from, delimitingRow.to)
    // Account for Emacs tables which are essentially pipe tables with the one
    // single exception that they contain "+" instead of "|" in the delimiter.
    .replace('+', '|')
    .split('|')
    // We can throw away leading whitespace because table headers are required
    // to be non-empty cells and must contain hyphens, whitespace, and colons.
    .map(c => c.trim())
    // NOTE: |-|-| will result in ['', '-', '-', ''] -> filter out
    .filter(c => c.length > 0)
    .map(c => {
      // Now extract the alignment characters
      if (c.startsWith(':') && c.endsWith(':')) {
        return 'center'
      } else if (c.startsWith(':')) {
        return 'left'
      } else if (c.endsWith(':')) {
        return 'right'
      } else {
        return null
      }
    })

  // Delimiter row determines alignment + correct number of columns
  const nCols = astNode.alignment.length

  // 2. Iterate over all top-level children, which can be TableHeader or
  //    TableRow to extract all rows.
  let row = node.firstChild
  while (row !== null) {
    if (row.name === 'TableDelimiter') {
      row = row.nextSibling
      continue // Skip the delimiting row
    }

    const tableRow: TableRow = {
      type: 'TableRow',
      name: row.name,
      from: row.from,
      to: row.to,
      cells: [],
      isHeaderOrFooter: row.name === 'TableHeader',
      whitespaceBefore: '',
      attributes: {}
    }

    astNode.rows.push(tableRow)

    // Each row consists of a mixture of TableCell and TableDelimiter. Note that
    // empty cells are not mounted as TableCell. Also, tables are still valid if
    // the leading and trailing pipes are left off. Finally, those leading and
    // trailing pipes can be left off randomly. We have to make a decision here,
    // which is the following: If a row starts with a delim and delim.from ===
    // row.from, we assume that this row starts with a delim. If delim.from >
    // row.from, we assume that this row starts with a whitespace-only cell that
    // hasn't been mounted by the parser.
    let child = row.firstChild
    if (child === null) {
      console.warn('Could not parse Table: A row node had zero children.')
      return genericTextNode(node.from, node.to, markdown.slice(node.from, node.to))
    }

    let hasHiddenFirstCell = false
    if (child.name === 'TableDelimiter' && child.from > row.from) {
      // We assume the row starts with a non-mounted, whitespace-only cell
      hasHiddenFirstCell = true
      // Put the cell's start in the middle of the whitespace
      const from = row.from + Math.ceil((child.from - row.from) / 2)
      const to = from

      tableRow.cells.push({
        type: 'TableCell',
        name: 'TableCell',
        from,
        to,
        whitespaceBefore: '',
        children: [],
        padding: {
          // Retain the cell's padding (the entire cell content from delimiter to delimiter)
          from: row.from,
          to: child.from
        },
        textContent: '',
        attributes: {}
      })
    }

    // At this point, we have accounted for a "hidden" first cell. Now we can
    // implement a simpler logic.
    let wasDelim = false
    while (child !== null) {
      if (child.name === 'TableDelimiter' && !wasDelim) {
        wasDelim = true
      } else if (child.name === 'TableDelimiter' && wasDelim) {
        // Last iteration was a TableDelimiter, and now again --> Unmounted cell
        const prev = child.prevSibling!
        // Put the cell in the center of the whitespace span
        const from = prev.to + Math.ceil((child.from - prev.to) / 2)
        const to = from

        const cellNode: TableCell = {
          type: 'TableCell',
          name: tableRow.isHeaderOrFooter ? 'th' : 'td',
          from,
          to,
          whitespaceBefore: '',
          children: [],
          padding: {
            // Retain the cell's padding (the entire cell content from delimiter to delimiter)
            from: prev.to,
            to: child.from
          },
          textContent: '',
          attributes: {}
        }
        tableRow.cells.push(cellNode)
      } else if (child.name === 'TableCell') {
        // Functional table cell. NOTE: The Lezer parser will trim whitespace
        // from the start and end.
        const cellNode: TableCell = {
          type: 'TableCell',
          name: tableRow.isHeaderOrFooter ? 'th' : 'td',
          from: child.from,
          to: child.to,
          whitespaceBefore: '',
          children: [],
          padding: {
            // Retain the cell's padding (the entire cell content from delimiter to delimiter)
            from: child.prevSibling !== null ? child.prevSibling.to : row.from,
            to: child.nextSibling !== null ? child.nextSibling.from : row.to
          },
          textContent: markdown.slice(child.from, child.to),
          attributes: {}
        }
        parseChildren(cellNode, child, markdown)
        tableRow.cells.push(cellNode)
        wasDelim = false
      } else {
        console.warn(`Could not fully parse Table node: Unexpected node "${child.name}" in row.`)
        wasDelim = false
      }
      child = child.nextSibling
    }


    // There is one final thing to do before we are done with the table row. We
    // have to check our assumption of "hidden" first cells. If a row has one
    // too many cells, we need to remove the first one again, because our
    // assumption was clearly wrong in this case.
    if (hasHiddenFirstCell && tableRow.cells.length === nCols + 1) {
      tableRow.cells.shift()
    }

    // Next row
    row = row.nextSibling
  }

  return astNode
}
