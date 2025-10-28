/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Equation menu
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a context menu for a given equation
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'

/**
 * Displays a context menu at the given coordinates, for the given equation.
 *
 * @param   {EditorView}                view      The view
 * @param   {string}                    equation  The equation in question
 * @param   {{ x: number, y: number }}  coords    The position
 */
export function equationMenu (view: EditorView, equation: string, coords: { x: number, y: number }): void {
  const tpl: AnyMenuItem[] = [
    {
      label: trans('Copy equation code'),
      type: 'normal',
      action () {
        navigator.clipboard.writeText(equation).catch(err => console.error(err))
      }
    }
  ]

  showPopupMenu(coords, tpl)
}
