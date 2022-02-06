/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        File context menu
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays a context menu for files.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'
import { AnyMenuItem } from '@dts/renderer/context'

const ipcRenderer = window.ipc
const clipboard = window.clipboard

export default function displayFileContext (event: MouseEvent, fileObject: MDFileMeta|CodeFileMeta, el: HTMLElement, callback: any): void {
  const template: AnyMenuItem[] = [
    {
      label: trans('menu.open_new_tab'),
      id: 'new-tab',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.properties'),
      id: 'properties',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('menu.rename_file'),
      id: 'menu.rename_file',
      accelerator: 'CmdOrCtrl+R',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.delete_file'),
      id: 'menu.delete_file',
      accelerator: 'CmdOrCtrl+Backspace',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.duplicate_file'),
      id: 'menu.duplicate_file',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('menu.copy_filename'),
      id: 'menu.copy_filename',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.copy_id'),
      id: 'menu.copy_id',
      type: 'normal',
      enabled: fileObject.type === 'file' && fileObject.id !== ''
    },
    {
      label: trans('menu.quicklook'),
      id: 'menu.quicklook',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('menu.show_file'),
      id: 'menu.show_file',
      type: 'normal',
      enabled: true
    }
  ]

  if (fileObject.parent == null) {
    template.push(
      { type: 'separator' },
      {
        id: 'menu.close_file',
        type: 'normal',
        label: trans('menu.close_file'),
        enabled: true
      })
  }

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template, (clickedID) => {
    callback(clickedID) // TODO
    switch (clickedID) {
      case 'menu.copy_filename':
        clipboard.writeText(fileObject.name)
        break
      case 'menu.copy_id':
        if (fileObject.type === 'file') {
          clipboard.writeText(fileObject.id)
        }
        break
      case 'menu.show_file':
        ipcRenderer.send('window-controls', {
          command: 'show-item-in-folder',
          payload: fileObject.path
        })
        break
    }
  })
}
