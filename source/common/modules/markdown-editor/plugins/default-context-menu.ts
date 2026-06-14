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
import { posInNode } from '../util/node-in-selection'
import { NODES } from '../parser/citation-parser'
import { citationMenu } from '../context-menu/citation-menu'

export const defaultContextMenu = EditorView.domEventHandlers({
  contextmenu (event, view) {
    const coords = { x: event.clientX, y: event.clientY }
    // First, determine where we clicked
    const pos = view.posAtCoords(coords)

    if (pos === null) {
      return false // No context menu to show
    }

    const tree = syntaxTree(view.state)

    const maybeLinkNode = posInNode(pos, tree, [ 'URL', 'Link', 'Image', 'LinkReference' ])
    if (maybeLinkNode !== null) {
      // We can show a Link/Image context menu!
      linkImageMenu(view, maybeLinkNode, coords)
      return true
    }

    const citationNode = posInNode(pos, tree, [NODES.CITATION])

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

    const node = tree.resolveInner(pos)
    defaultMenu(view, node, coords).catch(err => console.error(err))
    return true
  }
})
