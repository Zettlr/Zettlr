/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        removeMarkdownLink function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function removes a markdown link, performing necessary
 *                  transformations where applicable.
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { type ChangeSpec } from '@codemirror/state'
import { SyntaxNode } from '@lezer/common'

/**
 * Utility to remove a markdown link. It extracts the text from the markdown
 * link and replaces the link with just the text.
 *
 * @param {EditorView} view - The editor view
 * @param {SyntaxNode} node - The node containing the Link
 */
export function removeMarkdownLink (node: SyntaxNode, view: EditorView): void {
  // To deal with user being able to click on either part of the link (Text or URL)
  // Check which node they clicked on before passing it
  var useNode: SyntaxNode
  if (node.type.name === 'URL' && node.parent != null) {
    useNode = node.parent
  } else {
    useNode = node
  }

  const from = useNode.from
  const to = useNode.to

  // Using same logic seen in AST Parser
  const marks = useNode.getChildren('LinkMark')
  const linkText = view.state.sliceDoc(marks[0].to, marks[1].from)

  const changes: ChangeSpec = { from, to, insert: linkText }
  view.dispatch({ changes })
}
