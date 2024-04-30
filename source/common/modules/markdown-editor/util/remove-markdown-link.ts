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

/**
 * Utility to remove a markdown link. It extracts the text from the markdown
 * link and replaces the link with just the text.
 *
 * @param {EditorView} view - The editor view
 * @param {number} from - Starting position of the link markdown in the document
 * @param {number} to - Ending position of the link markdown in the document
 */
export function removeMarkdownLink (view: EditorView, from: number, to: number): void {
  const nodeText = view.state.sliceDoc(from, to)
  const linkText = nodeText.match(/\[(.*?)\]/g)?.map(match => match.slice(1, -1))[0]
  const changes: ChangeSpec = { from, to, insert: linkText }
  view.dispatch({ changes })
}
