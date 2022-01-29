/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Directory context menu
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays a context menu for directories.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { DirMeta } from '@dts/common/fsal'
import { AnyMenuItem } from '@dts/renderer/context'
import { IpcRenderer } from 'electron'

const ipcRenderer: IpcRenderer = (window as any).ipc

export default function displayFileContext (event: MouseEvent, dirObject: DirMeta, el: HTMLElement, callback: any): void {
  const TEMPLATE: AnyMenuItem[] = [
    {
      label: trans('menu.properties'),
      id: 'menu.properties',
      type: 'normal',
      enabled: true
    },
    {
      label: trans('menu.rename_dir'),
      type: 'normal',
      id: 'menu.rename_dir',
      enabled: true
    },
    {
      label: trans('menu.delete_dir'),
      type: 'normal',
      id: 'menu.delete_dir',
      enabled: true
    },
    {
      label: trans('gui.attachments_open_dir'),
      type: 'normal',
      id: 'gui.attachments_open_dir',
      enabled: true
    },
    {
      type: 'separator'
    },
    {
      label: trans('menu.new_file'),
      type: 'normal',
      id: 'menu.new_file',
      enabled: true
    },
    {
      label: trans('menu.new_dir'),
      type: 'normal',
      id: 'menu.new_dir',
      enabled: true
    }
  ]

  const NOT_FOUND_TEMPLATE: AnyMenuItem[] = [
    {
      id: 'menu.rescan_dir',
      type: 'normal',
      label: trans('menu.rescan_dir'),
      enabled: true
    }
  ]

  // Determine the template to use
  let template = TEMPLATE
  if (dirObject.dirNotFoundFlag === true) {
    template = NOT_FOUND_TEMPLATE
  }

  // Now check for a project
  if (dirObject.project !== null && dirObject.dirNotFoundFlag !== true) {
    template.push({ type: 'separator' })
    template.push({
      id: 'menu.project_build',
      type: 'normal',
      label: trans('menu.project_build'),
      // Only enable if there are formats to export to
      enabled: dirObject.project.formats.length > 0
    })
  }

  // Finally, check for it being root
  if (dirObject.parent == null) {
    template.push({ type: 'separator' })
    template.push({
      id: 'menu.close_workspace',
      type: 'normal',
      label: trans('menu.close_workspace'),
      enabled: true
    })
  }

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template, (clickedID) => {
    callback(clickedID) // TODO
    switch (clickedID) {
      case 'gui.attachments_open_dir':
        ipcRenderer.send('window-controls', {
          command: 'show-item-in-folder',
          payload: dirObject.path
        })
        break
      case 'menu.project_build':
        ipcRenderer.send('message', {
          command: 'dir-project-export',
          content: { path: dirObject.path }
        })
        break
      case 'menu.rescan_dir':
        ipcRenderer.send('message', {
          command: 'rescan-dir',
          content: { path: dirObject.path }
        })
    }
  })
}
