/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        nodeInSelection
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small function that checks if any range of a selection is
 *                  within the provided list of nodes
 *
 * END HEADER
 */

import type { EditorSelection } from '@codemirror/state'
import type { SyntaxNode, Tree } from '@lezer/common'

/**
 * Checks if any of the nodes are within the selection
 *
 * @param   {EditorSelection}   selection         The selection(s) to test
 * @param   {Tree}              tree              The syntax tree to search
 * @param   {string[]}          nodes             The names of nodes to search
 * @param   {-1|0|1}            side              How nodes shoud be entered.
 *                                                Passed to `SyntaxTree.resolveInner`
 *
 * @return  {boolean}                             `true` if any selection contains a node
 */
export function nodeInSelection (
  selection: EditorSelection,
  tree: Tree,
  nodes: string[],
  side: -1 | 0 | 1 = 0
): boolean {
  for (const range of selection.ranges) {
    if (posInNode(range.from, tree, nodes, side)) {
      return true
    }
  }
  return false
}

/**
 * Given a syntax tree and a position, this function returns whether the
 * position sits within a node matching those provided through `nodes`.
 *
 * @param   {number}            pos               The position to check
 * @param   {Tree}              tree              The syntax tree to search
 * @param   {string[]}          nodes             The names of nodes to search
 * @param   {-1|0|1}            side              How nodes shoud be entered.
 *                                                Passed to `SyntaxTree.resolveInner`
 *
 * @return  {boolean}                             `true` if the position touches a node.
 */
export function posInNode (
  pos: number,
  tree: Tree,
  nodes: string[],
  side: -1|0|1
): boolean {
  let node: SyntaxNode | null = tree.resolveInner(pos, side)

  while (node) {
    if (nodes.includes(node.name)) {
      return true
    }

    node = node.parent
  }

  // Neither the node itself, nor any of its parents, are protected.
  return false
}
