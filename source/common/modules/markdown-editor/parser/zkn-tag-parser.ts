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

const tagRE = /^(?<tag>##?[\w_-]+)#?(?:\/[\w_-]+)*/du

const subTagRe = /(?<sub>\/[\w_-]+)/gdu

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

    const tagText = ctx.text.slice(pos - ctx.offset)
    const match = tagRE.exec(tagText)
    if (!match?.indices?.groups) { return -1 }

    // Tags are allowed to be namespaced using `/` to delimit tag levels.
    // A namespaced tag is as follows: `#org/group/member`, and will be parsed
    // into the following tags: `#org`, `#org/group`, and `#org/group/member`
    const children = []

    let sub = null
    while ((sub = subTagRe.exec(tagText)) !== null) {
      if (!sub.indices?.groups) { continue }

      const subMark = ctx.elt('ZknTagMark', pos, pos + 1)
      children.push(ctx.elt('ZknTag', pos, pos + sub.indices.groups.sub[1], [subMark]))
    }

    // Add the top-level tag as a child
    const subMark = ctx.elt('ZknTagMark', pos, pos + 1)
    children.unshift(ctx.elt('ZknTag', pos, pos + match.indices.groups.tag[1], [subMark]))

    const tagMark = ctx.elt('ZknTagMark', pos, pos + 1)
    return ctx.addElement(ctx.elt('ZknTag', pos, pos + match[0].length, [ tagMark, ...children ]))
  }
}
