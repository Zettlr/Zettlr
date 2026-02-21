/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        isThisNodeAnyLiteralNodeInAYamlKeywordsOrTagsPair function
 * CVM-Role:        Utility function
 * Maintainers:     Oskar Pfeifer-Bley
 * License:         GNU GPL v3
 *
 * Description:     This function detects whether a given node is a literal node in a YAML keywords or tags pair.
 *                  It detects single tags and multiple tags in both notions, array and list.
 *
 * END HEADER
 */

import type { SyntaxNode } from '@lezer/common'
import type { EditorState } from '@codemirror/state'

/**
 * Recursively finds an ancestor node that matches a sequence of expected node types.
 *
 * @param {SyntaxNode|null} node        The starting node to check and traverse its parent chain.
 * @param {...string} expectedNodeTypes The sequence of expected node type names to match in order.
 * @return {SyntaxNode|null}            The matched ancestor node if the sequence matches; otherwise, null.
 */
function findNodeFollowingParentsTypes (node: SyntaxNode|null, ...expectedNodeTypes: string[]): SyntaxNode|null  {
  node = node?.parent ?? null
  if (node === null || expectedNodeTypes[0] !== node.type.name) {
    return null
  }
  if (expectedNodeTypes.length < 2) {
    return node
  }
  return findNodeFollowingParentsTypes(node, ...expectedNodeTypes.slice(1))
}

/**
 * This function detects whether a given node is a literal node in a YAML keywords or tags pair.
 *
 * Examples of literal nodes that would be matched together with their AST representation:
 *
 *  tags: "matched"
 *
 *  Document
 *  └─ BlockMapping
 *     └─ Pair
 *        ├─ Key
 *        │  └─ Literal (tags)
 *        └─ QuotedLiteral ("matched")
 *
 *
 *  keywords: [matched, "also matched"]
 *
 *  Document
 *  └─ BlockMapping
 *     └─ Pair
 *        ├─ Key
 *        │  └─ Literal (keywords)
 *        └─ FlowSequence
 *           ├─ Item
 *           │  └─ Literal (matched)
 *           └─ Item
 *              └─ QuotedLiteral ("also matched")
 *
 *
 *  tags:
 *   - matched
 *   - "also matched"
 *
 *  Document
 *  └─ BlockMapping
 *     └─ Pair
 *        ├─ Key
 *        │  └─ Literal (tags)
 *        └─ BlockSequence
 *           ├─ Item
 *           │  └─ Literal (matched)
 *           └─ Item
 *              └─ QuotedLiteral ("also matched")
 *
 * @param {SyntaxNode} node   The node to check
 * @param {EditorState} state The state of the editor containing the node
 *
 * @return {boolean}          True if the node is a literal node in a YAML keywords or tags pair
 */
export function isThisNodeAnyLiteralNodeInAYamlKeywordsOrTagsPair (node: SyntaxNode, state: EditorState): boolean {
  if (! [ 'Literal', 'QuotedLiteral' ].includes(node.type.name)) {
    return false
  }

  const dashListTags = findNodeFollowingParentsTypes(node, 'Item', 'BlockSequence', 'Pair')
  const arrayListTags = findNodeFollowingParentsTypes(node, 'Item', 'FlowSequence', 'Pair')
  const noListTags = findNodeFollowingParentsTypes(node, 'Pair')

  const tagsNode = (dashListTags ?? arrayListTags ?? noListTags)
  const tagsNodeIsDirectChildOfRoot = tagsNode?.parent?.parent?.type.name === 'Document'
  if (!tagsNodeIsDirectChildOfRoot) {
    return false
  }

  const possibleTagNameLiteralNode = tagsNode?.childAfter(0)?.childAfter(0)
  if (! possibleTagNameLiteralNode) {
    return false
  }
  const possibleTagKey = state.sliceDoc(possibleTagNameLiteralNode.from, possibleTagNameLiteralNode.to)

  return [ 'tags', 'keywords' ].includes(possibleTagKey)
}
