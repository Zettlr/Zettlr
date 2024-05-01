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
import { type SyntaxNode } from '@lezer/common'

/**
 * Utility to remove a markdown link. It extracts the text from the markdown
 * link and replaces the link with just the text.
 *
 * @param {EditorView} view - The editor view
 * @param {SyntaxNode} node - The node containing the Link
 */
export function removeMarkdownLink (node: SyntaxNode, view: EditorView): void {
  // To deal with user being able to click on either part of the link (Text or URL)
  // And the two different types of links []() and <>
  // Check which node they clicked on before passing it
  var useNode: SyntaxNode = node
  if (node.type.name === 'URL' && node.parent != null) {
    if (node.parent.type.name === 'Link') {
      useNode = node.parent
    } if (node.parent.type.name === 'Paragraph') {
      useNode = node
    }
  }

  const from = useNode.from
  const to = useNode.to

  var linkText: string
  if (useNode.type.name === 'URL') {
    // This is where the URL with <> formate is parsed
    // We add +- 1 to remove the < > brackets from the text
    linkText = view.state.sliceDoc(node.from+1, node.to-1)
  } else {
    // This is where the URL with []<> format is parsed
    // Using same logic seen in AST Parser to get the text between the []
    const marks = useNode.getChildren('LinkMark')
    linkText = view.state.sliceDoc(marks[0].to, marks[1].from)
  }
  const changes: ChangeSpec = { from, to, insert: linkText }
  view.dispatch({ changes })
}
