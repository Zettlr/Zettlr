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
 *                  non-URL-encoded file paths.
 *
 * END HEADER
 */

import type { DelimiterType, InlineParser } from '@lezer/markdown'

const LinkDelimiter: DelimiterType = {}

const linkClosingRe = /^\]\((?<url>.+)\)/

const linkTitleRe = /(?:^|[ \t]+)(?:"((?:\\.|[^"])+)"|'((?:\\.|[^'])+)'|\(((?:\\.|[^\)])+)\))$/

export const linkParser: InlineParser = {
  name: 'link-parser',
  before: 'Link',
  parse: (ctx, next, pos) => {
    if (next === 91) { // 91 === '['
      return ctx.addDelimiter(LinkDelimiter, pos, pos + 1, true, false)
    }

    if (next === 33 && ctx.char(pos + 1) === 91) { // 33 === '!', 91 === '['
      return ctx.addDelimiter(LinkDelimiter, pos, pos + 2, true, false)
    }

    const match = linkClosingRe.exec(ctx.text.slice(pos - ctx.offset))
    if (!match?.groups) { return -1 }

    const opening = ctx.findOpeningDelimiter(LinkDelimiter)
    if (opening === null) { return -1 }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) { return -1 }

    const isLink = delim.to - delim.from === 1
    let linkContents = ctx.takeContent(opening)
    // Remove nested links, which are invalid
    if (isLink) {
      linkContents = linkContents.filter(el => el.type !== 27) // 27 === 'Link'
    }

    ctx.addDelimiter(LinkDelimiter, pos, pos + 1, false, true)

    let url = match.groups.url

    // The url may contain additional parenthesis, so we need
    // to count the internal ones to track potential matching pairs
    // to find the external matching closing one.
    let depth = 0
    let stop = 0
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

    const title = linkTitleRe.exec(destination)
    const linkParts = []

    if (title) {
      destination = url.substring(0, title.index)

      const linkTitleText = title[1] || title[2] || title[3]
      linkParts.push(ctx.elt('LinkTitle', pos + 2 + title.index, pos + 2 + linkTitleText.length))
    }

    linkParts.push(ctx.elt('URL', pos + 2, pos + 2 + destination.length))

    const openingMark = ctx.elt('LinkMark', delim.from, delim.to)
    const closingMark = ctx.elt('LinkMark', pos, pos + 1)

    const openingUrlMark = ctx.elt('LinkMark', pos + 1, pos + 2)
    const closingUrlMark = ctx.elt('LinkMark', pos + 2 + url.length, pos + 3 + url.length)

    const children = [ openingMark, ...linkContents, closingMark, openingUrlMark, ...linkParts, closingUrlMark ]

    return ctx.addElement(ctx.elt(isLink ? 'Link' : 'Image', delim.from, pos + 3 + url.length, children))
  }
}
