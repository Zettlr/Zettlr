/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Footnote Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This inline parser adds footnote elements to the Lezer tree.
 *
 * END HEADER
 */

import type { InlineParser, BlockParser, DelimiterType, BlockContext, Line } from '@lezer/markdown'

const FootnoteDelimiter: DelimiterType = {}

const validFootnoteRe = /^[^\s\^\[\]]+$/

export const footnoteParser: InlineParser = {
  name: 'footnotes',
  before: 'Link', // [^1] will otherwise be detected as a link
  parse (ctx, next, pos) {
    if (next !== 91 && next !== 94 && next !== 93) { // 91 === '[', 94 === '^', 93 === ']'
      return -1
    }

    // Footnote Style: [^identifier]
    if (next === 91 && ctx.char(pos + 1) === 94) { // 91 === '[', 94 === '^'
      return ctx.addDelimiter(FootnoteDelimiter, pos, pos + 2, true, false)
    }

    // Footnote Style: ^[inline]
    if (next === 94 && ctx.char(pos + 1) === 91) {
      return ctx.addDelimiter(FootnoteDelimiter, pos, pos + 2, true, false)
    }

    let opening = null
    if (next === 93) {  // 93 === ']'
      opening = ctx.findOpeningDelimiter(FootnoteDelimiter)
    }

    if (opening === null) { return -1}

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) { return -1 }

    // Inline footnotes can contain markup, however, identifier footnotes cannot.
    const isInline = ctx.char(delim.from) === 94 // 94 === '^'

    // Finally, check if the identifier is valid
    if (!isInline && !validFootnoteRe.test(ctx.slice(delim.to, pos))) {
      return -1
    }

    const children = ctx.takeContent(opening)

    ctx.addDelimiter(FootnoteDelimiter, pos, pos + 1, false, true)
    return ctx.addElement(ctx.elt('Footnote', delim.from, pos + 1, isInline ? children : undefined))
  }
}

export const footnoteRefParser: BlockParser = {
  name: 'footnote-refs',
  parse (ctx, line) {
    // This prevents footnotes from nesting into footnotes
    // and it prevents infinite recursion and OOM errors.
    if (ctx.depth > 1) { return false }

    const match = /^\[\^[^\s\^\[\]]+\]:\s/.exec(line.text)
    if (!match) { return false }

    ctx.startComposite('FootnoteRef', 0)
    ctx.addElement(ctx.elt('FootnoteRefLabel', ctx.lineStart, ctx.lineStart + match[0].length - 1))

    line.moveBaseColumn(match[0].length)

    return null
  }
}

export function footnoteComposite (ctx: BlockContext, line: Line, _value: number): boolean {
  // If the line is indented, or the line is empty and the next line is indented.
  if (line.indent >= 4 || (/^\s*$/.test(line.text) && /^([ ]{4,}|\t)/.test(ctx.peekLine()))) {
    line.moveBaseColumn(4)
    return true
  }

  return false
}
