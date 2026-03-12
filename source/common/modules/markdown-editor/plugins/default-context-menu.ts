/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        defaultContextMenu
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Showws a default context menu that applies for an unspecific
 *                  position within the editor. Widgets may define their own
 *                  context menus as appropriate.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { EditorView } from '@codemirror/view'
import { defaultMenu } from '../context-menu/default-menu'
import { linkImageMenu } from '../context-menu/link-image-menu'
import type { SyntaxNode } from '@lezer/common'
import { NODES } from '../parser/citation-parser'
import { citationMenu } from '../context-menu/citation-menu'

/**
 * Takes an EditorView and a position within it, and returns either a SyntaxNode
 * of type URL, Link, or Image, or null. This information can be used to
 * determine whether there is any form of Link or image at the given position.
 *
 * @param   {EditorView}  view  The editor view
 * @param   {number}      pos   The position to check
*
 * @return  {SyntaxNode|null}   Either a Link, Image, or URL syntax node, or null.
 */
function getLinkOrImageNodeFromPos (view: EditorView, pos: number): SyntaxNode|null {
  const node = syntaxTree(view.state).resolveInner(pos)

  if ([ 'URL', 'Link', 'Image' ].includes(node.type.name)) {
    return node
  }

  let nodeAt: SyntaxNode|null = node
  while (nodeAt !== null && ![ 'Link', 'Image', 'LinkReference' ].includes(nodeAt.type.name)) {
    nodeAt = nodeAt.parent
  }

  return nodeAt
}

/**
 * If available, returns a Citation node at the current position.
 *
 * @param   {EditorView}  view  The editor view
 * @param   {number}      pos   The position
 *
 * @return  {SyntaxNode}        Either the citation node, or null
 */
function getCitationNodeFromPos (view: EditorView, pos: number): SyntaxNode|null {
  let node: SyntaxNode|null = syntaxTree(view.state).resolveInner(pos)

  while (node !== null && node.name !== NODES.CITATION) {
    node = node.parent
  }

  return node
}

export const defaultContextMenu = EditorView.domEventHandlers({
  contextmenu (event, view) {
    const coords = { x: event.clientX, y: event.clientY }
    // First, determine where we clicked
    const pos = view.posAtCoords(coords)

    if (pos === null) {
      return false // No context menu to show
    }

    const maybeLinkNode = getLinkOrImageNodeFromPos(view, pos)

    if (maybeLinkNode !== null) {
      // We can show a Link/Image context menu!
      linkImageMenu(view, maybeLinkNode, coords)
      return true
    }

    const citationNode = getCitationNodeFromPos(view, pos)

    if (citationNode !== null) {
      // We can show a citation menu
      citationMenu(view, coords, citationNode)
      return true
    }

    // If there is nothing selected, select the word at the coords
    const nothingSelected = view.state.selection.ranges.every(x => x.empty)
    const wordAt = view.state.wordAt(pos)
    if (nothingSelected && wordAt !== null) {
      view.dispatch({ selection: wordAt })
    }

    const node = syntaxTree(view.state).resolveInner(pos)
    defaultMenu(view, node, coords).catch(err => console.error(err))
    return true
  }
})
