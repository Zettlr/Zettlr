/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pandoc Span and Div Parser
 * CVM-Role:        InlineParser, BlockParser
 * Maintainer:      Bennie Milburn
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

const pandocDivOpeningRe = /^(?<mark>:{3,})[ \t]*(?:(?<name>[\w\-.]+)|(?:(?<class>[\w\-.]+)[ \t]+)?(?<attr>\{[ \w\t\-.%#:=;"')(]*\}))\s*$/d

const pandocDivClosingRe = /^(?<mark>:{3,})\s*$/d

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
    if (!match?.indices?.groups) {
      return -1
    }

    const opening = ctx.findOpeningDelimiter(PandocSpanDelimiter)
    if (opening === null) {
      return -1
    }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) {
      return -1
    }

    // Use the inline parser to generate the `PandocAttribute` node.
    // This avoids having to reconstruct the node here and synchronize it
    // with the other parser.
    const attrFrom = pos - ctx.offset + match.indices.groups.attr[0]
    const attrTo = pos - ctx.offset + match.indices.groups.attr[1]
    const attr = ctx.parser.parseInline(ctx.text.slice(attrFrom, attrTo), ctx.offset + attrFrom)

    // Check if a valid `PandocAttribute` node was found
    const nodeId = ctx.parser.nodeSet.types.find(node => node.is('PandocAttribute'))?.id
    if (attr.length !== 1 || attr[0].type !== nodeId) {
      return -1
    }

    const innerElements = ctx.takeContent(opening)
    ctx.addDelimiter(PandocSpanDelimiter, pos, pos + 1, false, true)

    const openingMark = ctx.elt('PandocSpanMark', delim.from, delim.to)
    const closingMark = ctx.elt('PandocSpanMark', pos, pos + 1)
    return ctx.addElement(ctx.elt('PandocSpan', delim.from, ctx.offset + attrTo, [ openingMark, ...innerElements, closingMark, ...attr ]))
  }
}

export const pandocDivParser: BlockParser = {
  name: 'pandoc-div',
  parse: (ctx, line) => {
    // Opening marks can only occur at the beginning of the line.
    // Likewise, to avoid infinitely re-parsing the line, we only
    // start testing the block if we are at the beginning.
    if (line.pos > 0) {
      return false
    }

    // Valid lines have the pattern `::: {#id .classes key=value}`.
    const match = pandocDivOpeningRe.exec(line.text)
    if (!match?.indices?.groups) {
      return false
    }

    // Pandoc divs require at least a class or attribute,
    // so if neither are present, this is either a closing mark,
    // in which case it will be handled by the node `composite` method,
    // or it is invalid.
    if ((match.groups?.name ?? match.groups?.class ?? match.groups?.attr) === undefined) {
      return false
    }

    // Start a composite block, similar to blockquotes.
    // This enables the node to contain other blocks as children.
    // By setting `value` to the current depth + 1, we can track
    // nesting level. This comes in handy in the node `composite` method
    // when we need to decide whether a block is closed by a closing
    // mark.
    ctx.startComposite('PandocDiv', 0, ctx.depth + 1)

    // We need to move the line position after parsing,
    // so we track the offset as we calculate markers
    // This is a line-relative position, not document-
    // relative.
    let lineBasePos = 0

    // Opening mark
    const [ markFrom, markTo ] = match.indices.groups.mark
    ctx.addElement(ctx.elt('PandocDivMark', ctx.lineStart + markFrom, ctx.lineStart + markTo))

    lineBasePos = markTo

    // Bare class names
    if (match.groups?.name !== undefined || match.groups?.class !== undefined) {
      const [ classFrom, classTo ] = match.indices.groups.name ?? match.indices.groups.class

      ctx.addElement(ctx.elt('PandocDivInfo', ctx.lineStart + classFrom, ctx.lineStart + classTo))

      lineBasePos = classTo
    }

    // `PandocAttribute` nodes
    if (match.groups?.attr !== undefined) {
      // Use the inline parser to generate the `PandocAttribute` node.
      // This avoids having to reconstruct the node here and synchronize it
      // with the other parser.
      const [ attrFrom, attrTo ] = match.indices.groups.attr
      const attr = ctx.parser.parseInline(line.text.slice(attrFrom, attrTo), ctx.lineStart + attrFrom)

      // Check if a valid attribute node was found.
      if (attr.length === 1) {
        // This method of finding the node id is currently the only
        // way I have found to get the id dynamically. Hardcoding the number
        // appears to be prone to issues if the order of node registration is changed.
        // Since it is not really performant, we make the call only when necessary
        const nodeId = ctx.parser.nodeSet.types.find(node => node.is('PandocAttribute'))?.id
        if (attr[0].type === nodeId) {
          ctx.addElement(attr[0])

          lineBasePos = attrTo
        }
      }
    }

    // Move the base position to avoid infinite loops
    line.moveBase(lineBasePos)

    return null // composite blocks require returning `null` on success
  },

  endLeaf: (_ctx, line, _leaf) => {
    return pandocDivClosingRe.test(line.text)
  }
}

// This function is used in the node [composite](https://github.com/lezer-parser/markdown?tab=readme-ov-file#user-content-nodespec.composite) method:
//
// If this is a composite block, this should hold a function that,
// at the start of a new line where that block is active, checks
// whether the composite block should continue (return value) and
// optionally adjusts the line's base position and registers nodes
// for any markers involved in the block's syntax.
export function pandocDivComposite (ctx: BlockContext, line: Line, value: number): boolean {
  // If the block nesting level (`value`) is not the same as the current
  // context depth, then we continue the block.
  if (ctx.parentType().name !== 'PandocDiv' || ctx.depth !== value) {
    return true
  }

  const match = pandocDivClosingRe.exec(line.text)
  if (!match?.indices?.groups) {
    return true
  }

  const [ markFrom, markTo ] = match.indices.groups.mark
  const from = ctx.lineStart + markFrom
  const to = ctx.lineStart + markTo

  // Add the closing marker and move the line position
  // up so that we do not re-parse the text.
  line.addMarker(ctx.elt('PandocDivMark', from, to))
  line.moveBase(to)

  return false
}
