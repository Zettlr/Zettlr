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
 * @param   {ASTNode}   ast   The AST
 * @param   {number}    from  Optional. If given, this function omits any text
 *                            node before this position
 * @param   {number}    to    Optional. If given, this function omits any text
 *                            node after this position.
 *
 * @return  {string[]}        The list of words
 */
function getCleanedWords (ast: ASTNode, from = 0, to?: number, locale?: string): string[] {
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

  const appLang: string | undefined =  typeof window !== 'undefined' ? window.config?.get('appLang') : undefined
  locale = locale !== undefined ? locale : appLang

  const segmenter = new Intl.Segmenter(locale, { granularity: 'word' })
  const plainText = textNodes
    .flatMap(node => {
      const segments = []
      for (const { segment, isWordLike } of segmenter.segment(node.value)) {
        if (isWordLike === true) { segments.push(segment) }
      }
      return segments
    })

  return plainText
}

/**
 * Returns an accurate word count based on a parsed AST.
 *
 * @param   {ASTNode}  ast   The parsed AST to use for counting
 * @param   {number}   from  Optional. If given, this function omits any text
 *                           node before this position
 * @param   {number}   to    Optional. If given, this function omits any text
 *                           node after this position.
 *
 * @return  {number}         The number of words in the file.
 */
export function countWords (ast: ASTNode, from = 0, to?: number, locale?: string): number {
  return getCleanedWords(ast, from, to, locale).length
}

/**
 * Returns an accurate character count (without spaces) based on a parsed AST.
 *
 * @param   {ASTNode}  ast   The parsed AST to use for counting
 * @param   {number}   from  Optional. If given, this function omits any text
 *                           node before this position
 * @param   {number}   to    Optional. If given, this function omits any text
 *                           node after this position.
 *
 * @return  {number}         The number of characters in the file
 */
export function countChars (ast: ASTNode, from = 0, to?: number, locale?: string): number {
  return getCleanedWords(ast, from, to, locale)
    .map(w => w.length)
    .reduce((prev, cur) => prev + cur, 0)
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
export function countAll (ast: ASTNode, from = 0, to?: number, locale?: string): { words: number, chars: number } {
  const words = getCleanedWords(ast, from, to, locale)
  return {
    words: words.length,
    chars: words.map(w => w.length).reduce((prev, cur) => prev + cur, 0)
  }
}
