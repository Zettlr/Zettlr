/**
 * BEGIN HEADER
 *
 * Contains:        Utility function
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains a utility function to count words.
 *
 * END HEADER
 */

import type { ASTNode } from '@common/modules/markdown-utils/markdown-ast'
import { extractTextnodes } from '@common/modules/markdown-utils'

/**
 * Takes an AST, extracts the text nodes and parses them into a pre-cleaned list
 * of words within the document.
 *
 * @param   {ASTNode}   ast       The AST
 * @param   {string}    locale    A string with a BCP 47 language tag
 * @param   {number}    from      Optional. If given, this function omits any text
 *                                node before this position
 * @param   {number}    to        Optional. If given, this function omits any text
 *                                node after this position.
 *
 * @return  {{ words: string[], chars: number }}    The list of words and number of characters
 */
function prepareCounts (ast: ASTNode, locale?: string, from = 0, to?: number): { words: string[], chars: number } {
  let textNodes = extractTextnodes(ast)
  if (from > 0) {
    textNodes = textNodes.filter(node => node.from >= from || node.to >= from)
    textNodes.map(node => {
      if (node.from < from) {
        node.value = node.value.substring(from - node.from)
      }
      return undefined
    })
  }
  if (to !== undefined) {
    textNodes = textNodes.filter(node => node.to <= to || node.from <= to)
    textNodes.map(node => {
      if (node.to > to) {
        node.value = node.value.substring(0, node.value.length - (node.to - to))
      }
      return undefined
    })
  }

  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })

  let chars = 0
  const words = textNodes
    .flatMap(node => {
      // this count includes non-formatting characters and whitespace,
      // however, because the way text nodes are parsed, preceding whitespace
      // may be excluded, such as for text following inline formatting.
      chars += node.value.length

      const segments = []
      for (const { segment, isWordLike } of segmenter.segment(node.value)) {
        if (isWordLike === true) {
          segments.push(segment)
        }
      }
      return segments
    })

  return { words, chars }
}

/**
 * Counts both words and characters, and characters without spaces.
 *
 * @param   {ASTNode}         ast   The parsed AST to use for counting
 * @param   {number}          from  Optional. If given, this function omits any
 *                                  text node before this position
 * @param   {number}          to    Optional. If given, this function omits any
 *                                  text node after this position.
 *
 * @return  {{words, chars}}        Word and character counts
 */
export function countAll (ast: ASTNode, locale?: string, from = 0, to?: number): { words: number, chars: number } {
  const { words, chars } = prepareCounts(ast, locale, from, to)
  return {
    words: words.length,
    chars: chars
  }
}
