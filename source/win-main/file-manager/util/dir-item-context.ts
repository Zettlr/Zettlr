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
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import type { DirDescriptor } from '@dts/common/fsal'
import type { WindowControlsIPCAPI } from 'source/app/service-providers/windows'

const ipcRenderer = window.ipc

export function displayDirContext (event: MouseEvent, dirObject: DirDescriptor, el: HTMLElement, callback: (clickedID: string) => void): void {
  const isMac = process.platform === 'darwin'
  const isWin = process.platform === 'win32'

  const TEMPLATE: AnyMenuItem[] = [
    {
      label: trans('Properties'),
      id: 'menu.properties',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: trans('New file…'),
      type: 'normal',
      id: 'menu.new_file'
    },
    {
      label: trans('New directory…'),
      type: 'normal',
      id: 'menu.new_dir'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Rename directory'),
      type: 'normal',
      id: 'menu.rename_dir'
    },
    {
      label: trans('Delete directory'),
      type: 'normal',
      id: 'menu.delete_dir'
    },
    {
      type: 'separator'
    },
    {
      label: trans('Copy path'),
      id: 'menu.copy_path',
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      label: isMac ? trans('Reveal in Finder') : isWin ? trans('Reveal in Explorer') : trans('Reveal in File Browser'),
      type: 'normal',
      id: 'gui.attachments_open_dir'
    }
  ]

  const NOT_FOUND_TEMPLATE: AnyMenuItem[] = [
    {
      id: 'menu.rescan_dir',
      type: 'normal',
      label: trans('Check for directory …')
    }
  ]

  // Determine the template to use
  let template = TEMPLATE
  if (dirObject.dirNotFoundFlag === true) {
    template = NOT_FOUND_TEMPLATE
  }

  // Now check for a project
  if (dirObject.settings.project !== null && dirObject.dirNotFoundFlag !== true) {
    template.push({ type: 'separator' })
    template.push({
      id: 'menu.project_build',
      type: 'normal',
      label: trans('Export Project'),
      // Only enable if there are files and formats to export to
      enabled: dirObject.settings.project.profiles.length > 0 && dirObject.settings.project.files.length > 0
    })
  }

  // Finally, check for it being root
  if (dirObject.root) {
    template.push({ type: 'separator' })
    template.push({
      id: 'menu.close_workspace',
      type: 'normal',
      label: trans('Close workspace')
    })
  }

  const point = { x: event.clientX, y: event.clientY }
  showPopupMenu(point, template, (clickedID) => {
    callback(clickedID) // TODO
    switch (clickedID) {
      case 'menu.copy_path':
        navigator.clipboard.writeText(dirObject.path).catch(err => console.error(err))
        break
      case 'gui.attachments_open_dir':
        ipcRenderer.send('window-controls', {
          command: 'show-item-in-folder',
          payload: { itemPath: dirObject.path }
        } as WindowControlsIPCAPI)
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
