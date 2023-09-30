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

import { type InlineParser } from '@lezer/markdown'

/**
 * Parses Pandoc attribute strings (e.g. `{.unnumbered}`) in the code
 */
export const pandocAttributesParser: InlineParser = {
  name: 'pandoc-attributes',
  parse: (ctx, next, pos) => {
    if (next !== 123) { // 123 === {
      return -1
    }

    if (pos === ctx.offset) {
      return -1 // Curly brackets must only *follow* something.
    }

    // Ensure a matching closing bracket.
    const relativeOffset = pos - ctx.offset
    if (ctx.text.indexOf('}') <= relativeOffset) {
      return -1
    }

    const end = ctx.offset + ctx.text.indexOf('}') + 1

    // Final check: Pandoc attributes must be either the last thing on the line
    // (then they basically apply to the whole line, i.e. with code block meta),
    // or directly preceeded by a non-whitespace symbol.
    const isWhitespaceAfter = /^\s*$/.test(ctx.text.slice(ctx.text.indexOf('}') + 1))
    if (/\s/.test(ctx.text[relativeOffset - 1]) && !isWhitespaceAfter) {
      return -1
    }

    const inlineCode = ctx.elt('InlineCode', pos, end, [
      ctx.elt('CodeMark', pos, pos + 1),
      ctx.elt('CodeMark', end - 1, end)
    ])

    return ctx.addElement(ctx.elt('PandocAttribute', pos, end, [inlineCode]))
  }
}
