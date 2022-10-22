import { BlockParser, Element, BlockContext /* , LeafBlockParser */ } from '@lezer/markdown'

// Group 1: ^| table contents |$; Group 2: some text | with pipes in between
const pipeRE = /^(\|.+?\|)$|(.+?\|.+?)/
const pipeHeaderRE = /^[|+:-]+$/
const gridLineRE = /^\+[-=+:]+\+$/
const gridContentRE = /^\|.+\|$/
const simpleHeaderRE = /^[\s-]+$/

// TODO: Simple parser!
function parseSimpleTable (ctx: BlockContext, pos: number, end: number, lines: string[]): Element {
  const rows: Element[] = []
  return ctx.elt('Table', pos, end, rows)
}

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
      const sep = ctx.elt('TableDelimiter', from, to)
      rows.push(ctx.elt('TableRow', from, to, [sep]))
    } else {
      // Content line -> move through the line and mark delimiters as we see them
      const children: Element[] = [ctx.elt('TableDelimiter', from, from + 1)]
      let cellFrom = from + 1
      let cellTo = cellFrom
      for (const ch of line.substring(1)) {
        if (ch === '|') {
          children.push(ctx.elt('TableCell', cellFrom, cellTo))
          children.push(ctx.elt('TableDelimiter', cellTo, cellTo + 1))
          cellFrom = cellTo
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
  // const header = ctx.elt('TableHeader')
  let from = pos
  let to = pos + lines[0].length
  let isFirstLine = true
  let isHeaderLine = false
  for (const line of lines) {
    to = from + line.length + 1
    if (isHeaderLine) {
      const delim = ctx.elt('TableDelimiter', from, to)
      rows.push(ctx.elt('TableRow', from, to, [delim]))
      isHeaderLine = false
      from = to
      continue
    }

    const children: Element[] = []
    let cellFrom = from
    let cellTo = from
    for (const ch of line) {
      if (ch === '|' && cellTo > from) {
        const type = isFirstLine ? 'TableHeader' : 'TableCell'
        children.push(ctx.elt(type, cellFrom, cellTo))
        children.push(ctx.elt('TableDelimiter', cellTo, cellTo + 1))
        cellFrom = cellTo + 1
      } else if (ch === '|' && cellFrom === from) {
        children.push(ctx.elt('TableDelimiter', cellFrom, cellFrom + 1))
        cellFrom++
      }
      cellTo++
    }

    rows.push(ctx.elt('TableRow', from, to, children))
    from = to

    if (isFirstLine) {
      isHeaderLine = true
      isFirstLine = false
    }
  }
  return ctx.elt('Table', pos, end, rows)
}

// const leafParser: LeafBlockParser = {
//   finish(cx, leaf) {
//     return false
//   },
//   nextLine(cx, line, leaf) {
//     return false
//   }
// }

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

export const pipeTableParser: BlockParser = {
  name: 'pipe-table',
  parse (ctx, line) {
    if (!pipeRE.test(line.text)) {
      return false
    }
    // We may have a pipe table. Requirement is that the next line is a header
    // const outerPipes = (pipeRE.exec(line.text) ?? [])[1] !== undefined
    const lines: string[] = [line.text]
    const start = ctx.lineStart
    ctx.nextLine()
    lines.push(line.text)
    if (!pipeHeaderRE.test(line.text)) {
      return false // No pipe table, after all.
    }
    ctx.nextLine()

    // The table ends with the first empty line
    let match: null|RegExpExecArray = null

    do {
      match = pipeRE.exec(line.text)
      if (match === null) {
        break
      }

      lines.push(line.text)
    } while (ctx.nextLine())

    if (lines.length < 3) {
      return false // Pipe tables need to span at least 3 lines
    }

    const end = ctx.prevLineEnd()

    const elt = parsePipeTable(ctx, start, end, lines)
    ctx.addElement(elt)
    return true
  }
}

// TODO: Docs for this: https://github.com/lezer-parser/markdown#user-content-blockparser
export const simpleTableParser: BlockParser = {
  name: 'simple-table',
  before: 'HorizontalRule',
  after: 'SetextHeading',
  parse: (ctx, line) => {
    console.warn(`SIMPLE TABLE "${line.text}"`)
    // Lastly, simple tables which are much harder to detect. First, we need a
    // non-empty line, then a line consisting of hyphens and spaces. If the
    // first line is a hyphen/space line, the table must end with a hyphen/
    // space line, otherwise an empty line marks the end of the table.
    const startsWithLine = simpleHeaderRE.test(line.text)
    const lines: string[] = [line.text]
    const start = ctx.lineStart
    ctx.nextLine()
    lines.push(line.text)

    if (!startsWithLine && !simpleHeaderRE.test(line.text)) {
      return false // Neither first nor second line is a hyphen/space line
    }

    if (startsWithLine) {
      // It must end with a line
      while (ctx.nextLine() && !simpleHeaderRE.test(line.text)) {
        lines.push(line.text)
      }
      lines.push(line.text)
    } else {
      // Next empty line marks the end
      while (ctx.nextLine() && line.text.trim() !== '') {
        lines.push(line.text)
      }

      if (lines.length < 3) {
        return false
      }
    }

    const end = ctx.lineStart + line.text.length

    console.log(`Simple table found between ${start} and ${end}!`, '\n' + lines.join('\n'))
    const elt = parseSimpleTable(ctx, start, end, lines)
    ctx.addElement(elt)
    return true
  }
}
