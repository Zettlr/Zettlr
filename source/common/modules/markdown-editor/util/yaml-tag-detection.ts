import type { SyntaxNode } from '@lezer/common'
import type { EditorState } from '@codemirror/state'

function findNodeFollowingParentsTypes (node: SyntaxNode|null, ...expectedNodeTypes: string[]): SyntaxNode|null  {
  node = node?.parent ?? null
  if (! node || expectedNodeTypes[0] !== node.type.name) {
    return null
  }
  if (expectedNodeTypes.length < 2) {
    return node
  }
  return findNodeFollowingParentsTypes(node, ...expectedNodeTypes.slice(1))
}

export function isAnyLiteralNodeContainingATag (node: SyntaxNode, state: EditorState): boolean {
  if (node.type.name === 'Literal' || node.type.name === 'QuotedLiteral') {
    return true
  }

  const dashListTags = findNodeFollowingParentsTypes(node, 'Item', 'BlockSequence', 'Pair')
  const arrayListTags = findNodeFollowingParentsTypes(node, 'Item', 'FlowSequence', 'Pair')
  const noListTags = findNodeFollowingParentsTypes(node, 'Pair')
  const possibleTagNameNode = (dashListTags ?? arrayListTags ?? noListTags)?.childAfter(0)?.childAfter(0)
  if (! possibleTagNameNode) {
    return false
  }
  const possibleTagKey = state.sliceDoc(possibleTagNameNode.from, possibleTagNameNode.to)

  return [ 'tags', 'keywords' ].includes(possibleTagKey)
}
