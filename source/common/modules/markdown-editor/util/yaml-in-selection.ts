/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        yamlInSelection
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small function that checks if any range of a selection is
 *                  within a YAMLFrontmatter node.
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { syntaxTree } from '@codemirror/language'
import type { SyntaxNode } from '@lezer/common'

/**
 * Tests if any selection range is inside a YAML frontmatter block.
 * YAML requires spaces for indentation, so we need to detect this to ensure
 * we always use spaces in frontmatter regardless of user's tab settings.
 *
 * @param   {EditorState}  state  The state in question
 *
 * @return  {boolean}             Returns true if any selection is in YAML frontmatter
 */
export function yamlInSelection (state: EditorState): boolean {
  const tree = syntaxTree(state)
  for (const range of state.selection.ranges) {
    // Use resolve() to directly find the node at the cursor position
    // and walk up the tree to check for YAML frontmatter ancestry
    let node: SyntaxNode | null = tree.resolve(range.from)
    while (node) {
      if ([ 'YAMLFrontmatter', 'YAMLFrontmatterStart', 'YAMLFrontmatterEnd' ].includes(node.name)) {
        return true
      }
      node = node.parent
    }
  }
  return false
}
