/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Admonition parser
 * CVM-Role:        BlockParser
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This inline parser detects admonitions adds corresponding
 *                  syntax nodes to the tree.
 *
 * END HEADER
 */

import type { BlockContext, BlockParser, Line } from '@lezer/markdown'

const admonitionRE = /^>(?<ws>\s*)\[!(?<keyword>note|tip|important|warning|caution|)\](?:\s*|(?<title>(.+)))$/id
const admonitionStartRE = /^(>\s*)+/

export const admonitionNodes = [
  'AdmonitionNote',
  'AdmonitionTip',
  'AdmonitionImportant',
  'AdmonitionWarning',
  'AdmonitionCaution'
] as const

export type AdmonitionNode = typeof admonitionNodes[number]

const admonitionTypes: Record<AdmonitionNode, string[]> = {
  AdmonitionNote: ['note'],
  AdmonitionTip: ['tip'],
  AdmonitionImportant: ['important'],
  AdmonitionWarning: ['warning'],
  AdmonitionCaution: ['caution']
}

/**
 * Helper function to determine the number of parent Admonitions
 */
function getNestingLevel (text: string): number {
  let depth = 0
  for (let idx = 0; idx < text.length; idx++) {
    if (text.charAt(idx) === '>') {
      depth++
    } else if (!/\s/.test(text.charAt(idx))) {
      break
    }
  }

  return depth
}

/**
 * This factory function returns block parsers that can parse composite blocks
 * based on the various admonition nodes that we have available. The reason we
 * have to resort to a factory function is that each BlockParser can only define
 * a single composite node, and we need different types of admonitions such that
 * the syntax highlighting theme can differentiate via colors and other styles
 * between the admonition nodes.
 *
 * @param   {AdmonitionNode}  admonitionType  The admonition type to produce
 *
 * @return  {BlockParser}                     The block parser
 */
export function admonitionParserFactory (admonitionType: AdmonitionNode): BlockParser {
  return {
    name: `admonition-${admonitionType}`, before: 'Blockquote',
    parse: (ctx, line) => {
      // The line needs to be a valid admonition start
      if (!admonitionStartRE.test(line.text)) {
        return false
      }

      // Ensure that even in nested admonitions, we execute on only the relevant
      // bit. The parent's composite parser will have moved the base accordingly.
      const linetext = line.text.slice(line.pos)
      const match = admonitionRE.exec(linetext)

      // Valid lines have the pattern `> [!KEYWORD]`.
      if (!match?.indices?.groups) {
        return false
      }

      // Admonitions require a keyword and, optionally a title.
      if (match.groups?.keyword === undefined) {
        return false
      }

      if (!admonitionTypes[admonitionType].includes(match.groups.keyword.toLowerCase())) {
        return false // Wrong admonition type
      }

      // Start a composite block, similar to blockquotes. This enables the node to
      // contain other blocks as children. By setting `value` to the nesting
      // depth, we can track nesting level. This comes in handy in the node
      // `composite` method when we need to decide whether a block is closed by a
      // closing mark.
      ctx.startComposite(admonitionType, line.pos, getNestingLevel(line.text))

      // Place the required initial elements to mark:
      //     >        [!     keyword     ]        optional title
      // QuoteMark CodeMark {keyword} CodeMark   AdmonitionTitle
      const linestart = ctx.lineStart + line.pos
      ctx.addElement(ctx.elt('QuoteMark', linestart, linestart + 1))

      const skippedSpace = ctx.lineStart + line.skipSpace(line.pos + 1)
      const [ kwStart, kwEnd ] = match.indices.groups.keyword
      // The admonition marker encompasses both the keyword and the two code
      // marks, because this way it can be styled in its entirety.
      ctx.addElement(ctx.elt('AdmonitionMark', skippedSpace, skippedSpace + 2))
      ctx.addElement(ctx.elt('AdmonitionKeyword', linestart + kwStart, linestart + kwEnd))
      ctx.addElement(ctx.elt('AdmonitionMark', linestart + kwEnd, linestart + kwEnd + 1))
      
      // We need to move the line position after parsing, so we track the offset
      // as we calculate markers. This is a line-relative position, not document-
      // relative.
      let lineBasePos = line.pos + kwEnd + 1

      if (match.groups?.title !== undefined) {
        const [ titleFrom, titleTo ] = match.indices.groups.title
        const skipped = line.skipSpace(titleFrom)
        ctx.addElement(ctx.elt('AdmonitionTitle', linestart + skipped, linestart + titleTo))
        lineBasePos = line.pos + titleTo
      }

      // Move the base position to avoid infinite loops
      line.moveBase(line.skipSpace(lineBasePos))

      return null // composite blocks require returning `null` on success
    },
  }
}

// This function is used in the node [composite](https://github.com/lezer-parser/markdown?tab=readme-ov-file#user-content-nodespec.composite) method:
//
// If this is a composite block, this should hold a function that,
// at the start of a new line where that block is active, checks
// whether the composite block should continue (return value) and
// optionally adjusts the line's base position and registers nodes
// for any markers involved in the block's syntax.
export function admonitionComposite (ctx: BlockContext, line: Line, value: number): boolean {
  if (!admonitionStartRE.test(line.text)) {
    return false
  }

  if (getNestingLevel(line.text) < value) {
    return false // End this (nested) block.
  }

  // Insert this level(s) quote mark and forward the line's base.
  line.addMarker(ctx.elt('QuoteMark', ctx.lineStart + line.pos, ctx.lineStart + line.pos + 1))
  line.moveBase(line.skipSpace(line.pos + 1))
  return true
}
