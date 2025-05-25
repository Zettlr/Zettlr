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

// Any character allowed before a tag (the first are space and nbsp)
const allowedCharsBefore = '  \t\n({['.split('')
const tagRE = /^##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?/u

export const zknTagParser: InlineParser = {
  name: 'zkn-tags',
  parse: (ctx, next, pos) => {
    if (next !== 35) { // #
      return -1
    }

    // Check the character before
    if (pos > ctx.offset && !allowedCharsBefore.includes(ctx.slice(pos - 1, pos))) {
      return -1
    }

    const currentOffset = pos - ctx.offset
    const restOfLine = ctx.text.slice(currentOffset)

    const match = tagRE.exec(restOfLine)
    if (match === null) {
      return -1
    }

    const end = pos + match[0].length
    // NOTE: Apparently syntax themes only style leaf nodes, not containers, so
    // we'll wrap the whole tag into a single ZknTagContent.
    // const markElem = ctx.elt('CodeMark', pos, pos + 1)
    const content = ctx.elt('ZknTagContent', pos, end)
    const tag = ctx.elt('ZknTag', pos, end, [content])
    return ctx.addElement(tag)
  }
}
