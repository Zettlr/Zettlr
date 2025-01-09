/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pandoc table Parser
 * CVM-Role:        Block Parser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Since the default Markdown mode only offers limited support
 *                  for tables, this parser ensures we detect any kind of table
 *                  supported by Pandoc in a given document. The exception are
 *                  simple tables, both because they are hard to detect and as
 *                  other parsers will always take precedence. Tl;DR: Use pipe
 *                  or grid tables instead. That's what we have the TableEditor
 *                  for.
 *
 * END HEADER
 */

import {
  type BlockParser,
  type Element,
  type BlockContext,
  type LeafBlockParser
} from '@lezer/markdown'

// Group 1: ^| table contents |$; Group 2: some text | with pipes in between
const pipeRE = /^(\|.+?\|)$|(.+?\|.+?)/
const pipeHeaderRE = /^[|+:-]+$/
const gridLineRE = /^\+[-=+:]+\+$/
const gridContentRE = /^\|.+\|$/

/**
 * Parses a grid table and returns a subtree that can be used for syntax highlighting
 *
 * @param   {BlockContext}  ctx    The context
 * @param   {number}        pos    Where the table starts in the document
 * @param   {number}        end    Where the table ends in the document
 * @param   {string[]}      lines  The list of lines belonging to the table
 *
 * @return  {Element}              The subtree
 */
function parseGridTable (ctx: BlockContext, pos: number, end: number, lines: string[]): Element {
  const rows: Element[] = []
  // Grid Tables alternate between separator lines and content lines. Content
  // lines can span multiple rows
  let from = pos
  let to = pos + lines[0].length
  for (const line of lines) {
    to = from + line.length
    const isSeparator = gridLineRE.test(line)
    if (isSeparator) {
      rows.push(ctx.elt('TableDelimiter', from, to))
    } else {
      // Content line -> move through the line and mark delimiters as we see them
      const children: Element[] = [ctx.elt('TableDelimiter', from, from + 1)]
      let cellFrom = from + 1
      let cellTo = cellFrom
      for (const ch of line.substring(1)) {
        if (ch === '|') {
          const cellContent = line.slice(cellFrom - from, cellTo - from)
          if (cellContent.trim() !== '') {
            // Similar as with pipe tables, don't emit empty cells
            children.push(
              ctx.elt(
                'TableCell',
                cellFrom, cellTo,
                ctx.parser.parseInline(cellContent, cellFrom)
              )
            )
          }
          children.push(ctx.elt('TableDelimiter', cellTo, cellTo + 1))
          cellFrom = cellTo + 1
        }
        cellTo++
      }
      rows.push(ctx.elt('TableRow', from, to, children))
    }
    from = to + 1
  }
  return ctx.elt('Table', pos, end, rows)
}

/**
 * Parses a pipe table and returns a subtree that can be used for syntax highlighting
 *
 * @param   {BlockContext}  ctx    The context
 * @param   {number}        pos    Where the table starts in the document
 * @param   {number}        end    Where the table ends in the document
 * @param   {string[]}      lines  The list of lines belonging to the table
 *
 * @return  {Element}              The subtree
 */
function parsePipeTable (ctx: BlockContext, pos: number, end: number, lines: string[]): Element {
  const rows: Element[] = []
  // For pipe tables, the first row is always the header, the second always the
  // delimiter, afterwards only content cells.
  let lineFrom = pos
  let lineTo = lineFrom + lines[0].length + 1
  let isFirstLine = true
  let isHeaderLine = false
  for (const line of lines) {
    lineTo = lineFrom + line.length + 1

    if (isFirstLine) {
      isHeaderLine = true
      isFirstLine = false
    } else if (isHeaderLine) {
      rows.push(ctx.elt('TableDelimiter', lineFrom, lineTo))
      isHeaderLine = false
      lineFrom = lineTo
      continue
    }

    // To ensure that our custom parser sticks as much as possible to the
    // official table parser, below is a modified version of Marijn's parsing
    // code.
    const children: Element[] = []
    let isEscaped = false
    let cellStart = -1
    let cellEnd = -1
    for (let i = 0; i < line.length; i++) {
      const next = line.charAt(i)
      if (next === '|' && !isEscaped) {
        if (cellStart > -1) {
          children.push(
            ctx.elt(
              'TableCell',
              lineFrom + cellStart,
              lineFrom + cellEnd,
              ctx.parser.parseInline(line.slice(cellStart, cellEnd), lineFrom + cellStart)
            )
          )
        }
        children.push(ctx.elt('TableDelimiter', lineFrom + i, lineFrom + i + 1))
        cellStart = cellEnd = -1
      } else if (isEscaped || ![ ' ', '\t' ].includes(next)) {
        if (cellStart < 0) {
          cellStart = i
        }
        cellEnd = i + 1
      }
      isEscaped = !isEscaped && next === '\\'
    }

    if (cellStart > -1) {
      children.push(
        ctx.elt(
          'TableCell',
          lineFrom + cellStart,
          lineFrom + cellEnd,
          ctx.parser.parseInline(line.slice(cellStart, cellEnd), lineFrom + cellStart)
        )
      )
    }

    rows.push(ctx.elt(isFirstLine ? 'TableHeader' : 'TableRow', lineFrom, lineTo, children))
    lineFrom = lineTo
  }
  return ctx.elt('Table', pos, end, rows)
}

export const gridTableParser: BlockParser = {
  name: 'grid-table',
  parse: (ctx, line) => {
    // Let's begin with the easiest thing to detect: grid tables
    if (!gridLineRE.test(line.text)) {
      return false
    }
    // We have a potential grid table. The end of the table is being marked by
    // the last line that matches a grid line.
    const lines: string[] = [line.text]
    const start = ctx.lineStart
    // We have alternating lines with +---+ and | cell |
    while (ctx.nextLine() && (gridLineRE.test(line.text) || gridContentRE.test(line.text))) {
      lines.push(line.text)
    }

    if (lines.length < 3) {
      return false // Grid tables must span at least three lines
    }

    const end = ctx.lineStart + line.text.length

    const elt = parseGridTable(ctx, start, end, lines)
    ctx.addElement(elt)
    return true
  }
}

const pipeLeafParser: LeafBlockParser = {
  nextLine (_ctx, _line, _leaf) {
    // Pipe tables are only finished on empty lines, i.e. we don't have to do
    // any logic in here.
    return false
  },
  finish (ctx, leaf) {
    // Called when there is an empty line, or something similar. At this point
    // we need to check that whatever is in the leaf block is a valid pipe table
    const lines = leaf.content.split('\n')
    if (lines.length < 3) {
      return false // Pipe tables must have at least three lines
    }

    if (!pipeHeaderRE.test(lines[1])) {
      return false // Second line must be a pipe table header
    }

    // All other lines must conform to pipeRE
    for (let i = 0; i < lines.length; i++) {
      if (i === 1) {
        continue
      }

      if (!pipeRE.test(lines[i])) {
        return false
      }
    }

    // Construct the pipe table
    const elt = parsePipeTable(ctx, leaf.start, leaf.start + leaf.content.length, lines)
    ctx.addLeafElement(leaf, elt)
    return true
  }
}

export const pipeTableParser: BlockParser = {
  name: 'pipe-table',
  leaf (ctx, leaf) {
    if (pipeRE.test(leaf.content)) {
      // NOTE: This will not detect "full" or "regular" pipe tables, since these
      // will already be handled by the GFM table parser. This parser therefore
      // basically only takes care of the "ugly" pipe tables (where the outer
      // pipes are omitted). So don't wonder if out of your test pipe tables
      // only some are detected, that's the reason.
      return pipeLeafParser
    } else {
      return null
    }
  }
}
