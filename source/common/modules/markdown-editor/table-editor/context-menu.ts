import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '../../window-register/application-menu-helper'

export function displayTableContextMenu (event: MouseEvent, callback: (clickedID: string) => void): void {
  const template: AnyMenuItem[] = [
    {
      label: trans('Bold'),
      accelerator: 'CmdOrCtrl+B',
      id: 'markdownBold',
      type: 'normal'
    },
    {
      label: trans('Italic'),
      accelerator: 'CmdOrCtrl+I',
      id: 'markdownItalic',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Insert link'),
      accelerator: 'CmdOrCtrl+K',
      id: 'markdownLink',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      id: 'cut',
      type: 'normal'
    },
    {
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      id: 'copy',
      type: 'normal'
    },
    {
      label: trans('Copy as HTML'),
      accelerator: 'CmdOrCtrl+Alt+C',
      id: 'copyAsHTML',
      type: 'normal'
    },
    {
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      id: 'paste',
      type: 'normal'
    },
    {
      label: trans('Paste without style'),
      accelerator: 'CmdOrCtrl+Shift+V',
      id: 'pasteAsPlain',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      id: 'selectAll',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Transform'),
      id: 'submenuTransform',
      type: 'submenu',
      submenu: [
        {
          label: trans('Zap gremlins'),
          id: 'zapGremlins',
          type: 'normal'
        },
        {
          label: trans('Strip duplicate spaces'),
          id: 'stripDuplicateSpaces',
          type: 'normal'
        },
        {
          label: trans('Italics to quotes'),
          id: 'italicsToQuotes',
          type: 'normal'
        },
        {
          label: trans('Quotes to italics'),
          id: 'quotesToItalics',
          type: 'normal'
        },
        {
          label: trans('Remove line breaks'),
          id: 'removeLineBreaks',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('Straighten quotes'),
          id: 'straightenQuotes',
          type: 'normal'
        },
        {
          label: trans('Ensure double quotes'),
          id: 'toDoubleQuotes',
          type: 'normal'
        },
        {
          label: trans('Double quotes to single'),
          id: 'doubleQuotesToSingle',
          type: 'normal'
        },
        {
          label: trans('Single quotes to double'),
          id: 'singleQuotesToDouble',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('Emdash — Add spaces around'),
          id: 'addSpacesAroundEmdashes',
          type: 'normal'
        },
        {
          label: trans('Emdash — Remove spaces around'),
          id: 'removeSpacesAroundEmdashes',
          type: 'normal'
        },
        {
          type: 'separator'
        },
        {
          label: trans('To sentence case'),
          id: 'toSentenceCase',
          type: 'normal'
        },
        {
          label: trans('To title case'),
          id: 'toTitleCase',
          type: 'normal'
        }
      ]
    },
    {
      type: 'separator'
    },
    {
      type: 'submenu',
      label: trans('Row'),
      id: '',
      enabled: true,
      submenu: [
        {
          type: 'normal',
          label: trans('Insert new row above'),
          id: 'insert.row.above',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Up' : 'Alt+Shift+Up'
        },
        {
          type: 'normal',
          label: trans('Insert new row below'),
          id: 'insert.row.below',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Down' : 'Alt+Shift+Down'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move row up'),
          id: 'move.row.up',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Up' : 'Alt+Up'
        },
        {
          type: 'normal',
          label: trans('Move row down'),
          id: 'move.row.down',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Down' : 'Alt+Down'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Clear row'),
          id: 'clear.row'
        },
        {
          type: 'normal',
          label: trans('Delete row'),
          id: 'delete.row'
        }
      ]
    },
    {
      type: 'submenu',
      label: trans('Column'),
      id: '',
      submenu: [
        {
          type: 'normal',
          label: trans('Insert new column left'),
          id: 'insert.col.left',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Left' : 'Alt+Shift+Left'
        },
        {
          type: 'normal',
          label: trans('Insert new column right'),
          id: 'insert.col.right',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Shift+Right' : 'Alt+Shift+Right'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move column left'),
          id: 'move.col.left',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Left' : 'Alt+Left'
        },
        {
          type: 'normal',
          label: trans('Move column right'),
          id: 'move.col.right',
          accelerator: process.platform === 'darwin' ? 'Ctrl+Right' : 'Alt+Right'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Align column text left'),
          id: 'align.col.left'
        },
        {
          type: 'normal',
          label: trans('Align column text center'),
          id: 'align.col.center'
        },
        {
          type: 'normal',
          label: trans('Align column text right'),
          id: 'align.col.right'
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
          id: 'clear.col'
        },
        {
          type: 'normal',
          label: trans('Delete column'),
          id: 'delete.col'
        }
      ]
    },
    {
      type: 'submenu',
      label: trans('Table'),
      id: '',
      submenu: [
        {
          type: 'normal',
          label: trans('Clear table'),
          id: 'clear.table'
        },
        {
          type: 'normal',
          label: trans('Delete table'),
          id: 'delete.table'
        }
      ]
    }
  ]

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template, (clickedID) => {
    callback(clickedID)
  })
}
