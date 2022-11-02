/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettelkasten Link Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small parser that adds Zettelkasten link elements to the tree.
 *
 * END HEADER
 */

import { InlineParser } from '@lezer/markdown'

// This parser adds Zettelkasten links to the syntax tree.
export function getZknLinkParser (linkStart: string, linkEnd: string): InlineParser {
  const startOrEndEmpty = linkStart.trim() === '' || linkEnd.trim() === ''
  const zknLinkParser: InlineParser = {
    // This parser should only match citations
    name: 'zkn-links',
    before: 'Link', // In case of default [[links]], the inner brackets would be detected as links
    parse: (ctx, next, pos) => {
      if (startOrEndEmpty) {
        return -1
      }

      const currentOffset = pos - ctx.offset
      const restOfLine = ctx.text.slice(currentOffset)
      if (!restOfLine.startsWith(linkStart)) {
        return -1
      }

      if (restOfLine.indexOf(linkEnd) < linkStart.length) {
        return -1
      }

      const from = pos
      const to = from + restOfLine.indexOf(linkEnd) + linkEnd.length

      const startFrom = pos
      const startTo = startFrom + linkStart.length

      const endFrom = pos + restOfLine.indexOf(linkEnd)
      const endTo = endFrom + linkEnd.length

      const contentFrom = startTo
      const contentTo = endFrom

      const startElem = ctx.elt('CodeMark', startFrom, startTo)
      const endElem = ctx.elt('CodeMark', endFrom, endTo)
      const contentElem = ctx.elt('ZknLinkContent', contentFrom, contentTo)
      const wrapper = ctx.elt('ZknLink', from, to, [ startElem, contentElem, endElem ])

      return ctx.addElement(wrapper)
    }
  }

  return zknLinkParser
}
