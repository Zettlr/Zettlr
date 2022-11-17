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
    const currentOffset = pos - ctx.offset
    // NOTE: We MUST always extract the citations from the whole line. Otherwise
    // @-symbols in illegal positions (e.g. emails) will be detected as valid.
    // Therefore we filter out all citations that do not exactly start at our
    // current offset.
    const citations = extractCitations(ctx.text).filter(c => c.from === currentOffset)

    // The first found citation after currentOffset must be exactly there.
    if (citations.length !== 1) {
      return -1
    }

    // At this point we have a citation and it's at the current pos
    return ctx.addElement(ctx.elt('Citation', pos, pos + citations[0].source.length))
  }
}
