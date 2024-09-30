/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citation Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This inline parser adds highlight elements to the tree
 *
 * END HEADER
 */

import { type InlineParser, type DelimiterType } from '@lezer/markdown'

const MarkDelimiter: DelimiterType = {
  resolve: 'HighlightContent',
  mark: 'HighlightMark' // No specific syntax node (for now due to backwards compatibility reasons)
}

function isWhitespace (c: number): boolean {
  const char = String.fromCharCode(c)
  return /\s/.test(char)
}

export const highlightParser: InlineParser = {
  name: 'highlights',
  parse: (ctx, next, pos) => {
    // The next char must be either a colon or an equal sign
    if (next !== 58 /* : */ && next !== 61 /* = */) {
      return -1
    }

    // The one following `next` must be the same character
    if (pos === ctx.end || next !== ctx.char(pos + 1)) {
      return -1
    }

    // A highlight marker is considered opening if it is at the beginning of the
    // line (bol) or is preceded by whitespace. Furthermore, it must not be
    // followed by whitespace and not be at the end of the line (eol).
    // For a highlight marker to be considered closing, it needs the opposite
    // requirements. This is why we need both checks (because otherwise closing
    // tags would allow preceding whitespace which would prompt Pandoc not to
    // render them).
    const bol = pos === ctx.offset
    const eol = pos === ctx.end
    const spaceBefore = bol || (pos > ctx.offset && isWhitespace(ctx.char(pos - 1)))
    const spaceAfter = eol || (pos + 1 < ctx.end && isWhitespace(ctx.char(pos + 2)))

    const isOpening = spaceBefore && !spaceAfter
    const isClosing = !spaceBefore // No check for spaceAfter to allow for, e.g., "Some ==test==." (with punctuation afterwards)

    return ctx.addDelimiter(MarkDelimiter, pos, pos + 2, isOpening, isClosing)
  }
}
