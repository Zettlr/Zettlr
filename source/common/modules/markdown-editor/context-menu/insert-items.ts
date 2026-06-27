/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getInsertSubmenu
 * CVM-Role:        Utility function
 * Maintainer:      benniekiss
 * License:         GNU GPL v3
 *
 * Description:     This function returns a shim submenu with all insert commands
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { type SubmenuItem } from '../../window-register/application-menu-helper'
import { trans } from 'source/common/i18n-renderer'
import { insertLink, applyBlockquote, applyOrderedList, applyBulletList, applyTaskList } from '../commands/markdown'

export function getInsertSubmenu (view: EditorView): SubmenuItem {
  return {
    label: trans('Insert'),
    id: 'submenuInsert',
    type: 'submenu',
    submenu: [
      {
        label: trans('Insert link'),
        accelerator: 'CmdOrCtrl+K',
        type: 'normal',
        action () { insertLink(view) }
      },
      {
        label: trans('Insert unordered list'),
        type: 'normal',
        action () { applyBulletList(view) }
      },
      {
        label: trans('Insert numbered list'),
        type: 'normal',
        action () { applyOrderedList(view) }
      },
      {
        label: trans('Insert task list'),
        accelerator: 'CmdOrCtrl+T',
        type: 'normal',
        action () { applyTaskList(view) }
      },
      {
        label: trans('Insert blockquote'),
        type: 'normal',
        action () { applyBlockquote(view) }
      },
      {
        label: trans('Insert table'),
        type: 'normal',
        action () { view.dispatch(view.state.replaceSelection('| | |\n|-|-|\n| | |\n')) }
      },
    ]
  }
}
