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

import { type InlineParser } from '@lezer/markdown'

export interface ZknLinkParserConfig {
  /**
   * Describes whether internal Zettelkasten/Wiki-Links should follow the format
   * `[[link|title]]`, or `[[title|link]]`. If not provided, the parser falls
   * back to the default `[[link|title]]`.
   *
   * * The `[[link|title]]` syntax is used by:
   *   * Obsidian
   *   * Wikipedia (MediaWiki)
   *   * VimWiki
   *   * Orgmode
   * * The `[[title|link]]` syntax is used by:
   *   * GitHub
   */
  format?: 'link|title'|'title|link'
}

// This parser adds Zettelkasten links to the syntax tree.
export const zknLinkParser = function (config?: ZknLinkParserConfig): InlineParser {
  return {
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

      // [[
      const startFrom = pos
      const startTo = startFrom + 2

      // ]]
      const endFrom = pos + restOfLine.indexOf(']]')
      const endTo = endFrom + 2

      // Populate the children array
      const children = [
        ctx.elt('CodeMark', startFrom, startTo),
        ctx.elt('CodeMark', endFrom, endTo)
      ]

      // Link contents
      const contentFrom = startTo
      const contentTo = endFrom
      const contents = ctx.text.slice(contentFrom - ctx.offset, contentTo - ctx.offset)

      const pipeIdx = contents.indexOf('|')
      // NOTE: In order to avoid either empty links or empty titles and having
      // to deal with these edge cases, we disallow putting pipes at either the
      // beginning or the end of a link.
      if (pipeIdx > 0 && !contents.endsWith('|')) {
        // The link contains both a link and a title.
        const titleFirst = config?.format === 'title|link'
        children.splice(1, 0,
          ctx.elt(titleFirst ? 'ZknLinkTitle' : 'ZknLinkContent', contentFrom, contentFrom + pipeIdx),
          ctx.elt('ZknLinkPipe', contentFrom + pipeIdx, contentFrom + pipeIdx + 1),
          ctx.elt(titleFirst ? 'ZknLinkContent' : 'ZknLinkTitle', contentFrom + pipeIdx + 1, contentTo)
        )
      } else {
        // The link equals the title, no pipe found
        children.splice(1, 0, ctx.elt('ZknLinkContent', contentFrom, contentTo))
      }

      const wrapper = ctx.elt('ZknLink', from, to, children)

      return ctx.addElement(wrapper)
    }
  }
}
