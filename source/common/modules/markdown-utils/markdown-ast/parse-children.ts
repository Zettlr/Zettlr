/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        parseChildren AST module
 * CVM-Role:        Utility
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Utility function for the AST parser that parses the children
 *                  of a semi-parsed AST node.
 *
 * END HEADER
 */

import type { SyntaxNode } from '@lezer/common'
import { type ASTNode, parseNode, type MDNode } from '../markdown-ast'
import { getWhitespaceBeforeNode } from './get-whitespace-before-node'
import { genericTextNode } from './generic-text-node'

/**
 * This list contains all Node names that do not themselves have any content.
 * These are either purely formatting nodes (such as heading marks or link
 * marks) who can be reconstructed without the verbatim value, as well as larger
 * container nodes (whose contents is represented via their children).
 *
 * @var {string[]}
 */
const EMPTY_NODES = [
  'HeaderMark',
  'CodeMark',
  'EmphasisMark',
  'SuperscriptMark',
  'SubscriptMark',
  'HighlightMark',
  'HeaderMark',
  'Blockquote',
  'QuoteMark',
  'ListMark',
  'TaskMarker',
  'YAMLFrontmatterStart',
  'YAMLFrontmatterEnd',
  'Document',
  'List',
  'ListItem',
  'TaskMarker',
  'PandocAttribute'
]

/**
 * Parses an attribute node (PandocAttribute), according to the Pandoc rules
 * (mostly). cf.: https://pandoc.org/MANUAL.html#extension-attributes
 *
 * @param   {Record<string, string>}  oldAttributes  Attribute nodes are merged.
 * @param   {SyntaxNode}              node           The SyntaxNode
 * @param   {string}                  markdown       The original markdown
 *
 * @return  {Record<string, string>}                 A map of the attributes
 */
function parseAttributeNode (oldAttributes: Record<string, string|string[]> = {}, node: SyntaxNode, markdown: string): Record<string, string|string[]> {
  if (node.name !== 'PandocAttribute') {
    return oldAttributes
  }

  const rawString: string = markdown.substring(node.from + 1, node.to - 1) // Remove { and }
  const rawAttributes: string[] = rawString.split(/\s+/)
  // General syntax: {#identifier .class .class key=value key=value}
  for (const attribute of rawAttributes) {
    if (attribute.startsWith('.')) {
      // It's a class
      if ('class' in oldAttributes) {
        oldAttributes.class = oldAttributes.class + ' ' + attribute.substring(1)
      } else {
        oldAttributes.class = attribute.substring(1)
      }
    } else if (attribute.startsWith('#') && !('id' in oldAttributes)) {
      // It's an ID, but only the *first* one found counts
      oldAttributes.id = attribute.substring(1)
    } else if (attribute.includes('=')) {
      // It's a key=value attribute. NOTE: Later generic attributes override
      // earlier ones!
      const parts: string[] = attribute.split('=')
      if (parts.length === 2) {
        oldAttributes[parts[0]] = parts[1]
      } // Else: Invalid
    }
  }
  return oldAttributes
}

/**
 * Parses the children of ASTNodes who can have children.
 *
 * @param   {T}           astNode   The AST node that must support children
 * @param   {SyntaxNode}  node      The original Lezer SyntaxNode
 * @param   {string}      markdown  The Markdown source
 *
 * @return  {T}                     Returns the same astNode with children.
 */
export function parseChildren<T extends { children: ASTNode[] } & MDNode> (astNode: T, node: SyntaxNode, markdown: string): T {
  if (node.firstChild === null) {
    if (!EMPTY_NODES.includes(node.name)) {
      const textNode = genericTextNode(node.from, node.to, markdown.substring(node.from, node.to), getWhitespaceBeforeNode(node, markdown))
      astNode.children = [textNode]
    }
    return astNode // We're done
  }

  astNode.children = []

  let currentChild: SyntaxNode|null = node.firstChild
  let currentIndex = node.from
  while (currentChild !== null) {
    // NOTE: We have to account for "gaps" where a node has children that do not
    // completely cover the node's contents. In that case, we have to add text
    // nodes that just contain those strings.
    if (currentChild.from > currentIndex && !EMPTY_NODES.includes(node.name)) {
      const gap = markdown.substring(currentIndex, currentChild.from)
      const onlyWhitespace = /^(\s*)/m.exec(gap)
      const whitespaceBefore = onlyWhitespace !== null ? onlyWhitespace[1] : ''
      const textNode = genericTextNode(
        currentIndex + whitespaceBefore.length,
        currentChild.from,
        gap.substring(whitespaceBefore.length),
        whitespaceBefore
      )
      astNode.children.push(textNode)
    }

    if (currentChild.name === 'PandocAttribute') {
      // PandocAttribute nodes should never show up in the tree
      // TODO: This assumes that the PandocAttribute should apply to the parent
      // node, but often (e.g., for images) they belong to the previous child!
      // TODO: Check what the *previous* child was, and if it can have attributes
      // Docs: https://pandoc.org/MANUAL.html#extension-attributes
      astNode.attributes = parseAttributeNode(astNode.attributes, currentChild, markdown)
    } else {
      astNode.children.push(parseNode(currentChild, markdown))
    }

    currentIndex = currentChild.to // Must happen before the nextSibling assignment
    currentChild = currentChild.nextSibling
  }

  if (currentIndex < node.to && !EMPTY_NODES.includes(node.name)) {
    // One final text node
    const gap = markdown.substring(currentIndex, node.to)
    const onlyWhitespace = /^(\s*)/m.exec(gap)
    const whitespaceBefore = onlyWhitespace !== null ? onlyWhitespace[1] : ''
    const textNode = genericTextNode(
      currentIndex + whitespaceBefore.length,
      node.to,
      markdown.substring(currentIndex + whitespaceBefore.length, node.to),
      whitespaceBefore
    )
    astNode.children.push(textNode)
  }

  return astNode
}
