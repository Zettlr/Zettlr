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
import type { CodeFileDescriptor, MDFileDescriptor } from '@dts/common/fsal'
import type { AnyMenuItem } from '@dts/renderer/context'

const ipcRenderer = window.ipc

export function displayFileContext (event: MouseEvent, fileObject: MDFileDescriptor|CodeFileDescriptor, el: HTMLElement, callback: (clickedID: string) => void): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  const template: AnyMenuItem[] = [
    {
      label: trans('Open in a new tab'),
      id: 'new-tab',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Properties'),
      id: 'properties',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Rename file'),
      id: 'menu.rename_file',
      accelerator: 'CmdOrCtrl+R',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Delete file'),
      id: 'menu.delete_file',
      accelerator: 'CmdOrCtrl+Backspace',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Duplicate file'),
      id: 'menu.duplicate_file',
      type: 'normal',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('Copy path'),
      id: 'menu.copy_path',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy filename'),
      id: 'menu.copy_filename',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('Copy ID'),
      id: 'menu.copy_id',
      type: 'normal',
      enabled: fileObject.type === 'file' && fileObject.id !== ''
    },
    {
      type: 'separator'
    },
    {
      label: isMac ? trans('Reveal in Finder') : isWin ? trans('Reveal in Explorer') : trans('Reveal in File Browser'),
      id: 'menu.show_file',
      type: 'normal',
      enabled: true
    }
  ]

  if (fileObject.root) {
    template.push(
      { type: 'separator' },
      {
        id: 'menu.close_file',
        type: 'normal',
        label: trans('Close file'),
        enabled: true
      })
  }

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template, (clickedID) => {
    callback(clickedID) // TODO
    switch (clickedID) {
      case 'menu.copy_filename':
        navigator.clipboard.writeText(fileObject.name).catch(err => console.error(err))
        break
      case 'menu.copy_path':
        navigator.clipboard.writeText(fileObject.path).catch(err => console.error(err))
        break
      case 'menu.copy_id':
        if (fileObject.type === 'file') {
          navigator.clipboard.writeText(fileObject.id).catch(err => console.error(err))
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
