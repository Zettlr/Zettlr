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
export const zknLinkParser: InlineParser = {
  // This parser should only match citations
  name: 'zkn-links',
  before: 'Link', // In case of default [[links]], the inner brackets would be detected as links
  parse: (ctx, next, pos) => {
    const currentOffset = pos - ctx.offset
    const restOfLine = ctx.text.slice(currentOffset)
    if (!restOfLine.startsWith('[[')) {
      return -1
    }

    if (restOfLine.indexOf(']]') < 2) {
      return -1
    }

    const from = pos
    const to = from + restOfLine.indexOf(']]') + 2

    const startFrom = pos
    const startTo = startFrom + 2

    const endFrom = pos + restOfLine.indexOf(']]')
    const endTo = endFrom + 2

    const contentFrom = startTo
    const contentTo = endFrom

    const startElem = ctx.elt('CodeMark', startFrom, startTo)
    const endElem = ctx.elt('CodeMark', endFrom, endTo)
    const contentElem = ctx.elt('ZknLinkContent', contentFrom, contentTo)
    const wrapper = ctx.elt('ZknLink', from, to, [ startElem, contentElem, endElem ])

    return ctx.addElement(wrapper)
  }
}
