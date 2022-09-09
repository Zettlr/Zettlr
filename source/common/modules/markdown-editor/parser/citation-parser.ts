import { InlineParser } from '@lezer/markdown'
import extractCitations from '@common/util/extract-citations'

// TODO: Docs for this: https://github.com/lezer-parser/markdown#user-content-blockparser
export const citationParser: InlineParser = {
  // This parser should only match citations
  name: 'citations',
  before: 'Link', // [@citekey, p. 123] will otherwise be detected as a link
  parse: (ctx, next, pos) => {
    const currentOffset = pos - ctx.offset
    const citations = extractCitations(ctx.text.slice(currentOffset))

    if (citations.length === 0) {
      return -1
    }

    // The first found citation must be at the current position (i.e. since we
    // only pass a slice, at pos 0)
    if (citations[0].from > 0) {
      return -1
    }

    // At this point we have a citation and it's at the current pos
    return ctx.addElement(ctx.elt('Citation', pos, pos + citations[0].to))
  }
}
