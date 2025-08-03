/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getWhitespaceBeforeNode
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Takes a SyntaxNode and returns any whitespace that preceeds
 *                  the node. This is important since whitespace can be
 *                  significant; especially when building HTML.
 *
 * END HEADER
 */

import { type SyntaxNode } from '@lezer/common'

/**
 * Extracts any amount of whitespace (`\t\s\n\r\f\v`, etc.) that occurs before
 * this node. TODO: Read through
 * https://developer.mozilla.org/en-US/docs/Web/API/Document_Object_Model/Whitespace
 * to determine if we have to change anything about this (especially in the
 * HTML converter).
 *
 * @param   {SyntaxNode}  node      The node to extract whitespace for
 * @param   {string}      markdown  The Markdown source to extract the whitespace
 *
 * @return  {string}                The whitespace string
 */
export function getWhitespaceBeforeNode (node: SyntaxNode, markdown: string): string {
  if (node.prevSibling !== null) {
    const sliceBefore = markdown.substring(node.prevSibling.to, node.from)
    const onlyWhitespace = /(\s*)$/m.exec(sliceBefore) // NOTE the "m" flag
    return onlyWhitespace !== null ? onlyWhitespace[1] : ''
  } else if (node.parent !== null) {
    const sliceBefore = markdown.substring(node.parent.from, node.from)
    const onlyWhitespace = /(\s*)$/m.exec(sliceBefore) // NOTE the "m" flag
    return onlyWhitespace !== null ? onlyWhitespace[1] : ''
  } else {
    return ''
  }
}
