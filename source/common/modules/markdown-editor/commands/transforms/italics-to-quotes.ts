import { extractASTNodes, markdownToAST } from '../../../markdown-utils'
import type { ASTNode, Emphasis, GenericNode } from '../../../markdown-utils/markdown-ast'
import { transformSelectedText } from './transform-selected-text'

/**
 * Convert italic delimiters to quoted delimiters.
 *
 * @example `_Cultures in Orbit_` ➡️ `"Cultures in Orbit"`
 * @example `*Cultures in Orbit*` ➡️ `"Cultures in Orbit"`
 *
 * @param   {string}  text  The text to be transformed.
 *
 * @return  {string}        The text with italic delimiters changed to quoted
 *                          delimiters.
 */
export const italicsToQuotes = transformSelectedText((text) => {
  const ast = markdownToAST(text)

  const nodes = extractASTNodes(ast, 'Emphasis')
    .filter(isEmphasisItalicNode)

  if (nodes.length === 0) {
    // there is no italicized text so there's nothing to do
    return text
  }

  return nodes.reduce((changedText, node) => {
    const start = node.children.at(0)
    const end = node.children.at(-1)

    if (isEmphasisMarkNode(start) && isEmphasisMarkNode(end)) {
      changedText = changedText.substring(0, start.from) + '"' + changedText.substring(start.to)
      changedText = changedText.substring(0, end.from) + '"' + changedText.substring(end.to)
    }

    return changedText
  }, text)
})

/**
 * Is the `node` an `Emphasis`?
 *
 * @param   {ASTNode}  node  the node to be checked.
 *
 * @return  {node}           `true` iff the `node` is an `Emphasis`.
 */
function isEmphasisNode (node: ASTNode | undefined): node is Emphasis {
  return node?.type === 'Emphasis'
}

/**
 * Is the `node` an `Emphasis` using _italics_ specifically?
 *
 * @param   {ASTNode}  node  the node to be checked.
 *
 * @return  {node}           `true` iff the `node` is an `Emphasis` using
 *                           _italics_ specifically.
 */
function isEmphasisItalicNode (node: ASTNode | undefined): node is Emphasis {
  return isEmphasisNode(node) && node.which === 'italic'
}

/**
 * Is the `node` a {@linkcode GenericNode}?
 *
 * @param   {ASTNode}  node  the node to be checked.
 *
 * @return  {node}           `true` iff the `node` is a `GenericNode`.
 */
function isGenericNode (node: ASTNode | undefined): node is GenericNode {
  return node?.type === 'Generic'
}

/**
 * Is the `node` an `EmphasisMark`?
 *
 * @param   {ASTNode}  node  the node to be checked.
 *
 * @return  {node}           `true` iff the `node` is an `EmphasisMark`.
 */
function isEmphasisMarkNode (node: ASTNode | undefined): node is GenericNode {
  return isGenericNode(node) && node.name === 'EmphasisMark'
}
