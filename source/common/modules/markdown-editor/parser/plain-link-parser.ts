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

import { InlineParser } from '@lezer/markdown'

// NOTE: The original URL regexp from the old Markdown mode may have looked
// sophisticated, but for our purposes here it's way too slow to compute.
// Instead of being exact, we're using heuristics here. If a slice of text looks
// even remotely like a link, we're gonna assume it's a link. Namely, we're
// assuming a link if something starts with a protocol (https://) or if it
// follows the form www.google.com (+ optional port number)
const protocolRe = /^[a-z0-9-]+:\/{1,3}[^\s\W]/i
const wwwRe = /^[a-z0-9-]+\.[a-z0-9-]+\.[a-z]{2,}(?::\d{2,5})?/i
const emailRe = /^[a-z0-9-.]+@[a-z0-9-.]+\.[a-z0-9-.]{2,}/i

// A small parser that can parse plain text links
export const plainLinkParser: InlineParser = {
  name: 'plain-links',
  parse: (ctx, next, pos) => {
    const relativeOffset = pos - ctx.offset
    const sliceBefore = ctx.text.slice(0, relativeOffset)
    const slice = ctx.text.slice(relativeOffset)
    const openBracketBefore = sliceBefore.lastIndexOf('[') > sliceBefore.lastIndexOf(']')
    const closeBracketAfter = slice.includes(']') && (slice.includes('[') ? slice.indexOf(']') < slice.indexOf('[') : true)
    if (openBracketBefore && closeBracketAfter) {
      return -1 // Somehow if we render an URL inside a Link title, the Link parser doesn't parse the link anymore
    }

    const match = /\s/.exec(slice)
    const nextSpace = match !== null ? match.index : ctx.end - pos

    if (protocolRe.test(slice) || emailRe.test(slice) || wwwRe.test(slice)) {
      return ctx.addElement(ctx.elt('URL', pos, pos + nextSpace))
    } else {
      // Definitely not a link
      return -1
    }
  }
}
