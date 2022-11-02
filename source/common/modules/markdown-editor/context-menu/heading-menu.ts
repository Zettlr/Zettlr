/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Heading menu
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a context menu for a given heading
 *
 * END HEADER
 */

import { EditorView } from '@codemirror/view'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem } from '@dts/renderer/context'
import { SyntaxNode } from '@lezer/common'
import { applyH1, applyH2, applyH3, applyH4, applyH5, applyH6 } from '../commands/markdown'

/**
 * Displays a context menu at the given coordinates, for the given node inside
 * the given view.
 *
 * @param   {EditorView}                view    The view
 * @param   {SyntaxNode}                node    The heading node
 * @param   {{ x: number, y: number }}  coords  The position
 */
export function headingMenu (view: EditorView, node: SyntaxNode, coords: { x: number, y: number }): void {
  const level = node.type.name.substring(node.type.name.length - 1)
  const tpl: AnyMenuItem[] = [
    {
      id: '1',
      label: '#',
      type: 'checkbox',
      enabled: true,
      checked: level === '1'
    },
    {
      id: '2',
      label: '##',
      type: 'checkbox',
      enabled: true,
      checked: level === '2'
    },
    {
      id: '3',
      label: '###',
      type: 'checkbox',
      enabled: true,
      checked: level === '3'
    },
    {
      id: '4',
      label: '####',
      type: 'checkbox',
      enabled: true,
      checked: level === '4'
    },
    {
      id: '5',
      label: '#####',
      type: 'checkbox',
      enabled: true,
      checked: level === '5'
    },
    {
      id: '6',
      label: '######',
      type: 'checkbox',
      enabled: true,
      checked: level === '6'
    }
  ]

  // In case of these nodes, we want to select the full node range
  view.dispatch({ selection: { anchor: node.from, head: node.to } })
  showPopupMenu(coords, tpl, (clickedID) => {
    if (clickedID === level) {
      // Nothing to do
    } else if (clickedID === '1') {
      applyH1(view)
    } else if (clickedID === '2') {
      applyH2(view)
    } else if (clickedID === '3') {
      applyH3(view)
    } else if (clickedID === '4') {
      applyH4(view)
    } else if (clickedID === '5') {
      applyH5(view)
    } else if (clickedID === '6') {
      applyH6(view)
    }
  })
}
