/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Citation Parser
 * CVM-Role:        InlineParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This inline parser adds citation elements to the Lezer tree.
 *
 * END HEADER
 */

import { InlineParser } from '@lezer/markdown'
import extractCitations from '@common/util/extract-citations'

// TODO: Docs for this: https://github.com/lezer-parser/markdown#user-content-blockparser
export const citationParser: InlineParser = {
  // This parser should only match citations
  name: 'citations',
  before: 'Link', // [@citekey, p. 123] will otherwise be detected as a link
  parse: (ctx, next, pos) => {
    // The next char must be either an opening bracket or an @
    if (next !== 64 && next !== 91) {
      // 64 = [; 91 = @
      return -1
    }

    // Ignore anything before pos
    const slice = ctx.text.slice(pos - ctx.offset)

    // Ensure the character before is valid
    const charBefore = pos > 0 ? ctx.slice(pos - 1, pos) : ' '
    const validBefore = pos === 0 || [ '(', ' ' ].includes(charBefore)
    if (!validBefore) {
      return -1
    }

    // NOTE: We MUST always extract the citations from the whole line. Otherwise
    // @-symbols in illegal positions (e.g. emails) will be detected as valid.
    // However, running extractCitations on a considerable piece of text has a
    // large performance impact, so we need to ensure we only run it if there's
    // a reasonable chance there's a citation at this position.
    const citations = extractCitations(slice).filter(c => c.from === 0)

    // The first found citation after currentOffset must be exactly there.
    if (citations.length !== 1) {
      return -1
    }

    // At this point we have a citation and it's at the current pos
    return ctx.addElement(ctx.elt('Citation', pos, pos + citations[0].source.length))
  }
}
