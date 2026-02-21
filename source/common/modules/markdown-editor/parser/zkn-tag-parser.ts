/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettelkasten Tag Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small parser that adds Zettelkasten tags to the tree.
 *
 * END HEADER
 */

import { type InlineParser } from '@lezer/markdown'

// Any character allowed before a tag
const allowedCharsBefore = /^[ \t\n\(\{\[]$/

// Tags start with one or two '#' followed by letters, numbers, emojis,
// underscores, or hyphens
const tagRE = /^##?[\p{L}\p{N}\p{Emoji}\uFE0F_-]+#?/u

export const zknTagParser: InlineParser = {
  name: 'zkn-tags',
  parse: (ctx, next, pos) => {
    if (next !== 35) { // 35 === '#'
      return -1
    }

    // Check the character before
    if (pos > ctx.offset && !allowedCharsBefore.test(ctx.slice(pos - 1, pos))) {
      return -1
    }

    const match = tagRE.exec(ctx.text.slice(pos - ctx.offset))
    if (match === null) { return -1 }

    const tagMark = ctx.elt('ZknTagMark', pos, pos + 1)
    return ctx.addElement(ctx.elt('ZknTag', pos, pos + match[0].length, [tagMark]))
  }
}
