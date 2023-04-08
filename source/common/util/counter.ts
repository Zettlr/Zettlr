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

import { ASTNode } from '@common/modules/markdown-utils/markdown-ast'
import { extractTextnodes } from '@common/modules/markdown-utils'

const interpunctionRE = /^[-–—.…:;,'%/\\_¡!¿?()[\]{}]+$/

/**
 * Takes an AST, extracts the text nodes and parses them into a pre-cleaned list
 * of words within the document.
 *
 * @param   {ASTNode}   ast  The AST
 *
 * @return  {string[]}       The list of words
 */
function getCleanedWords (ast: ASTNode): string[] {
  const textNodes = extractTextnodes(ast)
  const plainText = textNodes.map(node => node.value)
  return plainText
    .join(' ')
    .split(/[\s ]+/)
    .filter(w => w.trim() !== '')
    .filter(word => !interpunctionRE.test(word))
}

/**
 * Returns an accurate word count based on a parsed AST.
 *
 * @param   {ASTNode}  ast  The parsed AST to use for counting
 * @return  {number}        The number of words in the file.
 */
export function countWords (ast: ASTNode): number {
  return getCleanedWords(ast).length
}

/**
 * Returns an accurate character count (without spaces) based on a parsed AST.
 *
 * @param   {ASTNode}  ast  The parsed AST to use for counting
 *
 * @return  {number}        The number of characters in the file
 */
export function countChars (ast: ASTNode): number {
  return getCleanedWords(ast)
    .map(w => w.length)
    .reduce((prev, cur) => prev + cur, 0)
}

/**
 * Counts both words and characters, and characters without spaces.
 *
 * @param   {ASTNode}         ast  The parsed AST to use for counting
 *
 * @return  {{words, chars}}       Word and character counts
 */
export function countAll (ast: ASTNode): { words: number, chars: number } {
  const words = getCleanedWords(ast)
  return {
    words: words.length,
    chars: words.map(w => w.length).reduce((prev, cur) => prev + cur, 0)
  }
}
