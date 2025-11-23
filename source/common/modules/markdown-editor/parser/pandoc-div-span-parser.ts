/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pandoc Span and Div Parser
 * CVM-Role:        InlineParser, BlockParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module provides an inline and a block parser for pandoc
 *                  bracketed spans and fenced divs
 *
 * END HEADER
 */

import type { InlineParser, BlockParser, BlockContext, Line, DelimiterType } from '@lezer/markdown'

const PandocSpanDelimiter: DelimiterType = {}

const pandocSpanClosingRe = /^\](?<attr>\{[ \w\t\-.#:=;"')(]*\})/d

const pandocDivOpeningRe = /^[ \t]*(?<mark>:{3,})[ \t]+(?:(?<name>[\w\-.]+)|(?:(?<class>[\w\-.]+)[ \t]+)?(?<attr>\{[ \w\t\-.#:=;"')(]*\}))\s*$/d

const pandocDivClosingRe = /^[ \t]*(?<mark>:{3,})\s*$/d

export const pandocSpanParser: InlineParser = {
  name: 'pandoc-span',
  before: 'Link',
  parse: (ctx, next, pos) => {
    if (next === 91) { // 91 === '['
      ctx.addDelimiter(PandocSpanDelimiter, pos, pos + 1, true, false)

      // Return -1 so that the default link parser can add delimiters
      return -1
    }

    if (next !== 93) { // 93 === ']'
      return -1
    }

    // There are no valid attributes, so return
    const match = pandocSpanClosingRe.exec(ctx.text.slice(pos - ctx.offset))
    if (!match?.indices?.groups) { return -1 }

    const opening = ctx.findOpeningDelimiter(PandocSpanDelimiter)
    if (opening === null) { return -1 }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) { return -1 }

    const attrFrom = pos - ctx.offset + match.indices.groups.attr[0]
    const attrTo = pos - ctx.offset + match.indices.groups.attr[1]
    const attr = ctx.parser.parseInline(ctx.text.slice(attrFrom, attrTo), ctx.offset + attrFrom)

    // Check if a valid attribute node was found
    const nodeId = ctx.parser.nodeSet.types.find(node => node.is('PandocAttribute'))?.id
    if (attr.length !== 1 || attr[0].type !== nodeId) { return -1 }

    const innerElements = ctx.takeContent(opening)
    ctx.addDelimiter(PandocSpanDelimiter, pos, pos + 1, false, true)

    const openingMark = ctx.elt('PandocSpanMark', delim.from, delim.to)
    const closingMark = ctx.elt('PandocSpanMark', pos, pos + 1)
    return ctx.addElement(ctx.elt('PandocSpan', delim.from, ctx.offset + attrTo, [ openingMark, ...innerElements, closingMark, ...attr ]))
  }
}

export const pandocDivParser: BlockParser = {
  name: 'pandoc-div',
  before: 'IndentedCode',
  parse: (ctx, line) => {
    const match = pandocDivOpeningRe.exec(line.text)
    if (!match?.indices?.groups) { return false }

    // Pandoc divs require at least a class or attribute
    if ((match.groups?.name ?? match.groups?.class ?? match.groups?.attr) === undefined) { return false }

    ctx.startComposite('PandocDiv', 0, ctx.depth + 1)

    const [ markFrom, markTo ] = match.indices.groups.mark
    ctx.addElement(ctx.elt('PandocDivMark', ctx.lineStart + markFrom, ctx.lineStart + markTo))

    if ((match.groups?.name ?? match.groups?.class) !== undefined) {
      const [ classFrom, classTo ] = match.indices.groups.name ?? match.indices.groups.class

      ctx.addElement(ctx.elt('PandocDivInfo', ctx.lineStart + classFrom, ctx.lineStart + classTo))
    }

    if (match.groups?.attr !== undefined) {
      const [ attrFrom, attrTo ] = match.indices.groups.attr
      const attr = ctx.parser.parseInline(line.text.slice(attrFrom, attrTo), ctx.lineStart + attrFrom)

      // Check if a valid attribute node was found
      const nodeId = ctx.parser.nodeSet.types.find(node => node.is('PandocAttribute'))?.id
      if (attr.length === 1 && attr[0].type === nodeId) { ctx.addElement(attr[0]) }
    }

    // We consume the whole line since there can be no other content
    ctx.nextLine()
    return null
  },

  endLeaf: (_ctx, line, _leaf) => {
    return pandocDivClosingRe.test(line.text)
  }
}

export function pandocDivComposite (ctx: BlockContext, line: Line, value: number): boolean {
  if (ctx.depth !== value) { return true }

  const match = pandocDivClosingRe.exec(line.text.slice(line.pos))
  if (!match?.indices?.groups) { return true }

  const [ markFrom, markTo ] = match.indices.groups.mark
  const from = ctx.lineStart + line.pos + markFrom
  const to = ctx.lineStart + line.pos + markTo

  line.addMarker(ctx.elt('PandocDivMark', from, to))
  line.moveBase(to)

  return false
}
