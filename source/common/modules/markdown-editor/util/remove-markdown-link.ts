/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        removeMarkdownLink function
 * CVM-Role:        Utility function
 * Maintainers:     Neil Mazumdar NMazzy
 *                  Maxwell Bruce MWBruce
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
import { shortenUrlVisually } from 'source/common/util/shorten-url-visually'

/**
 * Utility to remove a markdown link. It extracts the text from the markdown
 * link and replaces the link with just the text.
 *
 * @param {EditorView} view - The editor view
 * @param {SyntaxNode} node - The node containing the Link
 */
export function removeMarkdownLink (node: SyntaxNode, view: EditorView): void {
  const from = node.from
  const to = node.to
  var linkText: string

  if (node.type.name === 'URL') {
    linkText = view.state.sliceDoc(from, to)
    if ((linkText[0] === '<') && (linkText[linkText.length-1] === '>')) {
      // This is where the URL with <> formate is parsed
      // We remove the < > brackets from the link text\
      const regex = /<([^>]+)>/g
      const match = regex.exec(linkText)
      if (match !== null) {
        linkText = match[1]
      } else {
        console.error('Unable to parse <> style URL')
        return
      }
    } else {
      // LinkText is already a URL
    }
  } else {
    // This is where the URL with []() format is parsed
    // Using same logic seen in AST Parser to get the text between the []
    const marks = node.getChildren('LinkMark')
    linkText = view.state.sliceDoc(marks[0].to, marks[1].from)
  }
  const changes: ChangeSpec = { from, to, insert: linkText }
  view.dispatch({ changes })
}
