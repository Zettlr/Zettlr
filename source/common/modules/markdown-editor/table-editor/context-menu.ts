import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '../../window-register/application-menu-helper'
import { getTransformSubmenu } from '../context-menu/transform-items'
import { type EditorView } from '@codemirror/view'
import { applyBold, applyItalic, insertLink } from '../commands/markdown'
import { copyAsHTML, copyAsPlain, cut, paste, pasteAsPlain } from '../util/copy-paste-cut'
import { selectAllCommand } from '../keymaps/table-editor'
import { addRowAfter, addRowBefore, clearRow, deleteRow, swapNextRow, swapPrevRow } from './commands/rows'
import { addColAfter, addColBefore, clearCol, deleteCol, swapNextCol, swapPrevCol } from './commands/columns'
import { clearTable, deleteTable, setAlignment } from './commands/tables'

export function displayTableContextMenu (event: MouseEvent, mainView: EditorView, subviewOrView: EditorView): void {
  const template: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      type: 'normal',
      action () { applyBold(subviewOrView) }
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      type: 'normal',
      action () { applyItalic(subviewOrView) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      type: 'normal',
      action () { insertLink(subviewOrView) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      type: 'normal',
      action () { cut(subviewOrView) }
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      type: 'normal',
      action () { copyAsPlain(subviewOrView) }
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      type: 'normal',
      action () { copyAsHTML(subviewOrView) }
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      type: 'normal',
      action () { paste(subviewOrView) }
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      type: 'normal',
      action () { pasteAsPlain(subviewOrView) }
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      type: 'normal',
      action () { selectAllCommand(subviewOrView) }
    },
    {
      type: 'separator'
    },
    getTransformSubmenu(subviewOrView),
    {
      type: 'separator'
    },
    {
      type: 'submenu',
      label: trans('Row'),
      enabled: true,
      submenu: [
        {
          type: 'normal',
          label: trans('Insert new row above'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Up' : 'Alt+Shift+Up',
          action () { addRowBefore(mainView) }
        },
        {
          type: 'normal',
          label: trans('Insert new row below'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Down' : 'Alt+Shift+Down',
          action () { addRowAfter(mainView) }
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move row up'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Up' : 'Alt+Up',
          action () { swapPrevRow(mainView) }
        },
        {
          type: 'normal',
          label: trans('Move row down'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Down' : 'Alt+Down',
          action () { swapNextRow(mainView) }
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Clear row'),
          action () { clearRow(mainView) }
        },
        {
          type: 'normal',
          label: trans('Delete row'),
          action () { deleteRow(mainView) }
        }
      ]
    },
    {
      type: 'submenu',
      label: trans('Column'),
      submenu: [
        {
          type: 'normal',
          label: trans('Insert new column left'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Left' : 'Alt+Shift+Left',
          action () { addColBefore(mainView) }
        },
        {
          type: 'normal',
          label: trans('Insert new column right'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Right' : 'Alt+Shift+Right',
          action () { addColAfter(mainView) }
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move column left'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Left' : 'Alt+Left',
          action () { swapPrevCol(mainView) }
        },
        {
          type: 'normal',
          label: trans('Move column right'),
          accelerator: process.platform === 'darwin' ? 'Ctrl+Right' : 'Alt+Right',
          action () { swapNextCol(mainView) }
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Align column text left'),
          action () { setAlignment('left')(mainView) }
        },
        {
          type: 'normal',
          label: trans('Align column text center'),
          action () { setAlignment('center')(mainView) }
        },
        {
          type: 'normal',
          label: trans('Align column text right'),
          action () { setAlignment('right')(mainView) }
        },
        { type: 'separator' },
        // {
        //   type: 'normal',
        //   label: trans('Sort column A-Z'),
        //   id: 'sort.col.asc',
        //   enabled: true
        // },
        // {
        //   type: 'normal',
        //   label: trans('Sort column Z-A'),
        //   id: 'sort.col.desc',
        //   enabled: true
        // },
        // { type: 'separator' },
        {
          type: 'normal',
          label: trans('Clear column'),
          action () { clearCol(mainView) }
        },
        {
          type: 'normal',
          label: trans('Delete column'),
          action () { deleteCol(mainView) }
        }
      ]
    },
    {
      type: 'submenu',
      label: trans('Table'),
      submenu: [
        {
          type: 'normal',
          label: trans('Clear table'),
          action () { clearTable(mainView) }
        },
        {
          type: 'normal',
          label: trans('Delete table'),
          id: 'delete.table',
          action () { deleteTable(mainView) }
        }
      ]
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template)
}
