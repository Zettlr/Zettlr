/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Plain Link Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Since the default Markdown mode doesn't apply URL elements
 *                  to plain links, we do that here.
 *
 * END HEADER
 */

import { type InlineParser } from '@lezer/markdown'

// Very basic heuristic for detecting links. For this parser, every microsecond
// counts.
const plainLinkRe = /^(?:[a-z]+:\/\/)?(?:[a-z0-9-]+\.)?[a-z0-9-]+\.[a-z]+[/a-z0-9#&=*+_~.%:?[\]@!$()-]+/i

// A small parser that can parse plain text links
export const plainLinkParser: InlineParser = {
  name: 'plain-links',
  parse: (ctx, next, pos) => {
    // NOTE: Because this parser has to look at basically everything, we have to
    // include a ruthless amount of shortcuts to return early wherever we can.
    // First check the current character -> must be [a-zA-Z].
    if ((next < 97 || next > 122) && (next < 65 || next > 90)) {
      return -1
    }

    // Next, minimum length: x.y.zz -> 6; also has to include a dot.
    if (ctx.text.length < 6 || !ctx.text.includes('.')) {
      return -1
    }

    const relativeOffset = pos - ctx.offset
    // There cannot be a space in a plain link, so immediately account for that
    const slice = ctx.text.slice(relativeOffset, ctx.text.indexOf(' ', relativeOffset))

    // Same check as above, now with the actual slice
    if (slice.length < 6 || !slice.includes('.')) {
      return -1
    }

    const sliceBefore = ctx.text.slice(0, relativeOffset)
    const openBracketBefore = sliceBefore.lastIndexOf('[') > sliceBefore.lastIndexOf(']')
    const closeBracketAfter = slice.includes(']') && (slice.includes('[') ? slice.indexOf(']') < slice.indexOf('[') : true)
    if (openBracketBefore && closeBracketAfter) {
      return -1 // Somehow if we render an URL inside a Link title, the Link parser doesn't parse the link anymore
    }

    const match = plainLinkRe.exec(slice)

    if (match !== null) {
      return ctx.addElement(ctx.elt('URL', pos, pos + match[0].length))
    } else {
      // Definitely not a link
      return -1
    }
  }
}
