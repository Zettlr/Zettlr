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
import { headingMenu } from '../context-menu/heading-menu'
import { linkImageMenu } from '../context-menu/link-image-menu'

export const defaultContextMenu = EditorView.domEventHandlers({
  contextmenu (event, view) {
    const coords = { x: event.clientX, y: event.clientY }
    // First, determine where we clicked
    const pos = view.posAtCoords(coords)

    if (pos === null) {
      return false // No context menu to show
    }

    const node = syntaxTree(view.state).resolve(pos)
    console.log(`Context menu at node ${node.type.name}.`)

    switch (node.type.name) {
      case 'ATXHeading1':
      case 'ATXHeading2':
      case 'ATXHeading3':
      case 'ATXHeading4':
      case 'ATXHeading5':
      case 'ATXHeading6':
      case 'SetextHeading1':
      case 'SetextHeading2':
        headingMenu(view, node, coords)
        return true
      case 'Link':
      case 'Image':
        linkImageMenu(view, node, coords)
        return true
      default: {
        // If there is nothing selected, select the word at the coords
        const nothingSelected = view.state.selection.ranges.every(x => x.empty)
        const wordAt = view.state.wordAt(pos)
        if (nothingSelected && wordAt !== null) {
          view.dispatch({ selection: wordAt })
        }

        defaultMenu(view, node, coords).catch(err => console.error(err))
        return true
      }
    }
  }
})
