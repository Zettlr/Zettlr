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

import { type InlineParser } from '@lezer/markdown'

export const highlightParser: InlineParser = {
  name: 'highlights',
  // before: 'Link',
  parse: (ctx, next, pos) => {
    // The next char must be either a colon or an equal sign
    if (next !== 58 && next !== 61) {
      // 58 = :; 61 = =
      return -1
    }

    const slice = ctx.text.slice(pos - ctx.offset)

    if (!slice.startsWith('::') && !slice.startsWith('==')) {
      return -1
    }

    const idx = slice.startsWith('::') ? slice.indexOf('::', 2) : slice.indexOf('==', 2)
    if (idx <= 2) { // idx must be > 2 (to ensure there's content in there)
      return -1
    }

    // At this point we have a citation and it's at the current pos
    const content = ctx.elt('HighlightContent', pos + 2, pos + idx)
    const wrapper = ctx.elt('Highlight', pos, pos + idx + 2, [content])
    return ctx.addElement(wrapper)
  }
}
