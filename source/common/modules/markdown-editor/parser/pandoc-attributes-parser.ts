/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Pandoc Attributes parser
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Pandoc supports attributes for various elements in order to
 *                  add metadata to elements. For example, headers can receive a
 *                  custom identifier by specifying it in curly braces
 *                  afterwards, code-blocks can receive more metadata by
 *                  wrapping the info string in curly braces, and images can
 *                  receive specific width and height metrics. This inline
 *                  parser here parses these into tree elements that can then be
 *                  styled.
 *
 * END HEADER
 */

import type { DelimiterType, InlineParser } from '@lezer/markdown'

const PandocAttributeDelimiter: DelimiterType = {}

/**
 * Parses Pandoc attribute strings (e.g. `{.unnumbered}`) in the code
 */
export const pandocAttributesParser: InlineParser = {
  name: 'pandoc-attributes',
  parse: (ctx, next, pos) => {
    if (next === 123) { // 123 === '{'
      return ctx.addDelimiter(PandocAttributeDelimiter, pos, pos + 1, true, false)
    }

    let opening = null
    if (next === 125) { // 125 === '}'
      opening = ctx.findOpeningDelimiter(PandocAttributeDelimiter)
    }

    if (opening === null) { return -1 }

    const delim = ctx.getDelimiterAt(opening)
    if (delim === null) { return -1 }

    const whitespaceBefore = /^\s*$/.test(ctx.slice(delim.from - 1, delim.from))
    const whitespaceAfter = /^\s*$/.test(ctx.text.slice(pos - ctx.offset + 1))

    // Pandoc attributes must be either the last thing on the line
    // (then they basically apply to the whole line, i.e. with code block meta),
    // or directly preceeded by a non-whitespace symbol.
    if (whitespaceBefore && !whitespaceAfter) { return - 1 }

    ctx.takeContent(opening)
    ctx.addDelimiter(PandocAttributeDelimiter, pos, pos + 1, false, true)

    const openingMark = ctx.elt('PandocAttributeMark', delim.from, delim.to)
    const closingMark = ctx.elt('PandocAttributeMark', pos, pos + 1)

    return ctx.addElement(ctx.elt('PandocAttribute', delim.from, pos + 1, [ openingMark, closingMark ]))
  }
}
