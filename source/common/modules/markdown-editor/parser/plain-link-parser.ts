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

// NOTE: The original URL regexp from the old Markdown mode may have looked
// sophisticated, but for our purposes here it's way too slow to compute.
// Instead of being exact, we're using heuristics here. If a slice of text looks
// even remotely like a link, we're gonna assume it's a link.

const plainLinkRe = /^(?:[a-z]+:\/\/)?(?:[a-z0-9-]+\.)?[a-z0-9-]+\.[a-z]+[/a-z0-9#&=*+_~.%:?[\]@!$()-]+/i

// A small parser that can parse plain text links
export const plainLinkParser: InlineParser = {
  name: 'plain-links',
  parse: (ctx, next, pos) => {
    const abc = next >= 97 && next <= 122 // Lowercase letters
    const ABC = next >= 65 && next <= 90 // Uppercase letters
    if (!abc && !ABC) {
      return -1
    }

    const relativeOffset = pos - ctx.offset
    const sliceBefore = ctx.text.slice(0, relativeOffset)
    // There cannot be a space in a plain link, so immediately account for that
    const slice = ctx.text.slice(relativeOffset, ctx.text.indexOf(' ', relativeOffset))

    if (!slice.includes('.')) { // There must be a dot in there
      return -1
    }

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
