/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Image and Link parser
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A parser for images and links that, contrary to the
 *                  built-in parser, allows spaces and non-encoded characters
 *                  in URLs, allowing users the ability to paste readable,
 *                  non-URL-encoded file paths. This is similar to pandoc's parsing.
 *
 *                  Note: This should only handle link nodes with URLs, and all other link
 *                  types should end up being handled by the default link parser.
 *
 * END HEADER
 */

import type { DelimiterType, InlineParser } from '@lezer/markdown'

const PandocLinkDelimiter: DelimiterType = {}

const linkClosingRe = /^\]\((?<url>.+)\)/

const linkTitleRe = /(?:^|[ \t]+)(?:"(?<double>(?:\\.|[^"])+)"|'(?<single>(?:\\.|[^'])+)'|\((?<parens>(?:\\.|[^\)])+)\))$/d

export const pandocLinkParser: InlineParser = {
  name: 'pandoc-link-parser',
  before: 'Link',
  parse: (ctx, next, pos) => {
    if (next === 91) { // 91 === '['
      ctx.addDelimiter(PandocLinkDelimiter, pos, pos + 1, true, false)

      // Return -1 so that the default link parser can add delimiters
      return -1
    }

    if (next === 33 && ctx.char(pos + 1) === 91) { // 33 === '!', 91 === '['
      ctx.addDelimiter(PandocLinkDelimiter, pos, pos + 2, true, false)

      // Return -1 so that the default link parser can add delimiters
      return -1
    }

    if (next !== 93) { // 93 === ']'
      return -1
    }

    // If there's no valid URL, return so the default parser can handle
    // the other link types.
    const match = linkClosingRe.exec(ctx.text.slice(pos - ctx.offset))
    if (!match?.groups) { return -1 }

    const opening = ctx.findOpeningDelimiter(PandocLinkDelimiter)
    if (opening === null) { return -1 }

    const delim = ctx.getDelimiterAt(opening)
    if (!delim) { return -1 }

    const isLink = delim.to - delim.from === 1
    let linkContents = ctx.takeContent(opening)

    ctx.addDelimiter(PandocLinkDelimiter, pos, pos + 1, false, true)

    // Remove nested links, which are invalid
    if (isLink) {
      const linkType = ctx.parser.nodeSet.types.find(node => node.is('Link'))?.id
      const urlType = ctx.parser.nodeSet.types.find(node => node.is('URL'))?.id
      linkContents = linkContents.filter(el => el.type !== linkType && el.type !== urlType)
    }

    // The url may contain additional parenthesis, so we need
    // to count the internal ones to track potential matching pairs
    // to find the external matching closing one.
    let depth = 0
    let stop = 0
    let url = match.groups.url

    while (stop <= url.length) {
      const char = url.charAt(stop)

      // Found the closing parenthesis
      if (char === ')' && depth === 0) { break }

      if (char === ')') { depth-- }
      if (char === '(') { depth++ }
      stop++
    }

    url = url.substring(0, stop)

    let destination = url

    const urlContents = []
    const title = linkTitleRe.exec(destination)

    if (title?.indices?.groups) {
      destination = url.substring(0, title.index)

      const linkTitleIndices = title.indices.groups.double ?? title.indices.groups.single ?? title.indices.groups.parens
      urlContents.push(ctx.elt('LinkTitle', pos + 2 + linkTitleIndices[0], pos + 2 + linkTitleIndices[1]))
    }

    urlContents.unshift(ctx.elt('URL', pos + 2, pos + 2 + destination.length))

    const openingUrlMark = ctx.elt('LinkMark', pos + 1, pos + 2)
    const closingUrlMark = ctx.elt('LinkMark', pos + 2 + url.length, pos + 3 + url.length)

    const openingMark = ctx.elt('LinkMark', delim.from, delim.to)
    const closingMark = ctx.elt('LinkMark', pos, pos + 1)

    // This child node structure mirrors the codemirror Link structure
    const children = [ openingMark, ...linkContents, closingMark, openingUrlMark, ...urlContents, closingUrlMark ]

    return ctx.addElement(ctx.elt(isLink ? 'Link' : 'Image', delim.from, pos + 3 + url.length, children))
  }
}
