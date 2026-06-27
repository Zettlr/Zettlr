/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getFormatSubmenu
 * CVM-Role:        Utility function
 * Maintainer:      benniekiss
 * License:         GNU GPL v3
 *
 * Description:     This function returns menu items for formatting commands
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import { applyBold, applyItalic } from '../commands/markdown'
import { copyAsHTML, copyAsPlain, cut, paste, pasteAsPlain } from '../util/copy-paste-cut'
import { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { getTransformSubmenu } from './transform-items'

export function getFormatMenuItems (view: EditorView): AnyMenuItem[] {
  return [
    {
      type: 'separator'
    },
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      type: 'normal',
      action () { applyBold(view) }
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      type: 'normal',
      action () { applyItalic(view) }
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      type: 'normal',
      action () { cut(view) }
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      type: 'normal',
      action () { copyAsPlain(view) }
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      type: 'normal',
      action () { copyAsHTML(view) }
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      type: 'normal',
      action () { paste(view) }
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      type: 'normal',
      action () { pasteAsPlain(view) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      type: 'normal',
      action () { view.dispatch({ selection: { anchor: 0, head: view.state.doc.length } }) }
    },
    {
      type: 'separator'
    },
    getTransformSubmenu(view)
  ]
}
