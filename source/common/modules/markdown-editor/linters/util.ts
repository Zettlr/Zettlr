/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Linter utilities
 * CVM-Role:        Utility Functions
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains utility functions that the various linters (may) need.
 *
 * END HEADER
 */
import { ASTNode } from '@common/modules/markdown-utils/markdown-ast'

/**
 * Nodes that should be ignored during spell checking
 *
 * @var {string[]}
 */
const ignoredNodes = [ 'ZettelkastenLink', 'ZettelkastenTag', 'Citation' ]

/**
 * This function can be used as a filter for `extractTextNodes` and ensures that
 * only nodes are being returned that should actually be checked for spelling
 * mistakes. This then excludes, for example, comments or Zettelkasten links.
 *
 * @param   {ASTNode}  node  The node to be checked
 *
 * @return  {boolean}        Returns true if the node should be processed
 */
export function filterNodesForSpellchecking (node: ASTNode): boolean {
  if (ignoredNodes.includes(node.type)) {
    return false
  }

  if (node.type === 'Text' && node.value.startsWith('<!--') && node.value.endsWith('-->')) {
    return false
  }

  return true
}
