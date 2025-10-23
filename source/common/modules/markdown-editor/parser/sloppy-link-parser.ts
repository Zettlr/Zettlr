/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Image and Link parser
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small parser that can parse images and links that,
 *                  contrary to the built-in parser, allows spaces and non-
 *                  encoded characters in URLs. While this is the correct
 *                  behavior, Markdown has to deal with many local images and
 *                  links, and in there it's quite annoying either to have to
 *                  replace all spaces with %20, or have the images not work.
 *                  Here we basically implement a more "sloppy" parser that
 *                  gives our users the ability to paste readable, non-URL-
 *                  encoded file paths.
 *
 * END HEADER
 */

import type { DelimiterType, InlineParser } from '@lezer/markdown'

const LinkDelimiter: DelimiterType = {}

const linkClosingRe = /^\]\((?<url>[^\)]+)\)/

const linkTitleRe = /(?:^|[ \t]+)(?:"(.+)"|'(.+)'|\((.+)\))$/

export const sloppyLinkParser: InlineParser = {
  name: 'sloppy-link-parser',
  before: 'Link',
  after: 'zkn-links',
  parse: (ctx, next, pos) => {
    // Even though we are parsing after `zkn-links`, we still have to ensure
    // that we are not accidentally parsing the interior brackets as links
    if (next === 91 && ctx.char(pos - 1) !== 91 && ctx.char(pos + 1) !== 91) { // 91 === '['
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

    const linkLabel = ctx.elt('LinkLabel', delim.to, pos, ctx.takeContent(opening))

    ctx.addDelimiter(LinkDelimiter, pos, pos + 1, false, true)

    const url = match.groups.url
    const title = linkTitleRe.exec(url)
    const linkParts = []

    let destination = url

    if (title) {
      destination = url.substring(0, title.index)

      const linkTitleText = title[1] || title[2] || title[3]
      const linkTitle = ctx.elt('LinkTitle', pos + 2 + title.index, pos + 2 + linkTitleText.length)
      linkParts.push(linkTitle)
    }

    const linkDest = ctx.elt('URL', pos + 2, pos + 2 + destination.length)
    linkParts.push(linkDest)

    const isLink = delim.to - delim.from === 1

    const openingMarks = []
    openingMarks.push(ctx.elt('LinkMark', delim.from, delim.from + 1))

    if (!isLink) {
      openingMarks.push(ctx.elt('LinkMark', delim.from + 1, delim.to))
    }

    const closingMark = ctx.elt('LinkMark', pos, pos + 1)
    const urlMark = ctx.elt('LinkMark', pos + 1, pos + 2)
    const closingUrlMark = ctx.elt('LinkMark', pos + 2 + url.length, pos + 3 + url.length)

    const children = [ ...openingMarks, linkLabel, closingMark, urlMark, ...linkParts, closingUrlMark ]

    return ctx.addElement(ctx.elt(isLink ? 'Link' : 'Image', delim.from, pos + 3 + url.length, children))
  }
}
