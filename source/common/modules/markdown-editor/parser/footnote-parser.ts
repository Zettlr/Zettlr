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

import { InlineParser, BlockParser } from '@lezer/markdown'
import { partialParse } from './partial-parse'

// TODO: Docs for this: https://github.com/lezer-parser/markdown#user-content-blockparser
export const footnoteParser: InlineParser = {
  // This parser should only match inline footnotes
  name: 'footnotes',
  before: 'Link', // [^1] will otherwise be detected as a link
  parse (ctx, next, pos) {
    const relativePosition = pos - ctx.offset
    const match = /\[\^[^\s]+\]|\[\^.+\^\]/.exec(ctx.text.slice(relativePosition))

    if (match === null || match.index > 0) {
      return -1
    }

    // At this point we have a footnote and it's at the current pos
    return ctx.addElement(ctx.elt('Footnote', pos, pos + match[0].length))
  }
}

export const footnoteRefParser: BlockParser = {
  name: 'footnote-refs',
  parse (ctx, line) {
    const match = /^\[\^[^\s]\]:\s/.exec(line.text)
    if (match === null) {
      return false
    }

    const refFrom = ctx.lineStart

    const label = ctx.elt('FootnoteRefLabel', refFrom, ctx.lineStart + match[0].length - 1)

    const from = ctx.lineStart + match[0].length
    let to = ctx.lineStart + line.text.length // One newline less here

    const footnoteBody: string[] = [line.text.slice(match[0].length)]

    // Everything at least indented by 4 spaces OR empty lines belong to this paragraph
    while (ctx.nextLine() && /^\s{4,}|^\s*$/.test(line.text)) {
      footnoteBody.push(line.text)
      to += line.text.length + 1
    }

    // Remove trailing empty lines from the body itself
    let bodyTo = to
    while (footnoteBody.length > 0 && footnoteBody[footnoteBody.length - 1].trim() === '') {
      const lastline = footnoteBody.pop() as string
      bodyTo = bodyTo - lastline.length - 1
    }

    const treeElem = partialParse(ctx, ctx.parser, footnoteBody.join('\n'), from)
    const body = ctx.elt('FootnoteRefBody', from, bodyTo, [treeElem])

    const wrapper = ctx.elt('FootnoteRef', refFrom, to, [ label, body ])
    ctx.addElement(wrapper)

    return true
  }
}
