import { trans } from '@common/i18n-renderer'
import showPopupMenu, { type AnyMenuItem } from '../../window-register/application-menu-helper'

export function displayTableContextMenu (event: MouseEvent, callback: (clickedID: string) => void): void {
  const template: AnyMenuItem[] = [
    {
      type: 'submenu',
      label: trans('Row'),
      id: '',
      enabled: true,
      submenu: [
        {
          type: 'normal',
          label: trans('Insert new row above'),
          id: 'insert.row.above'
        },
        {
          type: 'normal',
          label: trans('Insert new row below'),
          id: 'insert.row.below'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move row up'),
          id: 'move.row.up'
        },
        {
          type: 'normal',
          label: trans('Move row down'),
          id: 'move.row.down'
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
          id: 'insert.col.left'
        },
        {
          type: 'normal',
          label: trans('Insert new column right'),
          id: 'insert.col.right'
        },
        { type: 'separator' },
        {
          type: 'normal',
          label: trans('Move column left'),
          id: 'move.col.left'
        },
        {
          type: 'normal',
          label: trans('Move column right'),
          id: 'move.col.right'
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
