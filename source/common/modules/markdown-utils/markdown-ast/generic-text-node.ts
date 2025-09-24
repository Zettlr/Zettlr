/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        genericTextNode
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A simple function that wraps a piece of plain text into an
 *                  ASTNode.
 *
 * END HEADER
 */

import { type TextNode } from '../markdown-ast'

/**
 * Creates a generic text node; this is used to represent textual contents of
 * SyntaxNodes.
 *
 * @param   {number}    from              The absolute start offset
 * @param   {number}    to                The absolute end offset
 * @param   {string}    value             The actual text
 * @param   {string}    whitespaceBefore  Potential whitespace before the node
 *
 * @return  {TextNode}                    The rendered TextNode
 */
export function genericTextNode (from: number, to: number, value: string, whitespaceBefore = ''): TextNode {
  return { type: 'Text', name: 'text', from, to, value, whitespaceBefore, attributes: {} }
}
