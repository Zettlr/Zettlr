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

const ipcRenderer = window.ipc

const TEMPLATE = [
  {
    label: 'menu.properties',
    id: 'properties',
    type: 'normal'
  },
  {
    label: 'menu.rename_dir',
    command: 'dir-rename'
  },
  {
    label: 'menu.delete_dir',
    command: 'dir-delete'
  },
  {
    label: 'gui.attachments_open_dir',
    command: 'dir-open-externally'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.new_file',
    command: 'file-new'
  },
  {
    label: 'menu.new_dir',
    command: 'dir-new'
  }
]

const NOT_FOUND_TEMPLATE = [
  {
    id: 'menu.rescan_dir',
    label: 'menu.rescan_dir',
    enabled: true
  }
]

export default function displayFileContext (event, dirObject, el, callback) {
  let items = []

  // Determine the template to use
  let template = TEMPLATE
  if (dirObject.dirNotFoundFlag === true) {
    template = NOT_FOUND_TEMPLATE
  }

  for (const item of template) {
    const buildItem = {}

    buildItem.id = item.label
    if (item.label !== undefined) {
      buildItem.label = trans(item.label)
    }

    if (item.accelerator !== undefined) {
      buildItem.accelerator = item.accelerator
    }

    buildItem.command = item.command
    buildItem.type = item.type
    buildItem.enabled = true

    items.push(buildItem)
  }

  // Now check for a project
  if (dirObject.project !== null && dirObject.dirNotFoundFlag !== true) {
    items.push({ type: 'separator' })
    items.push({
      id: 'menu.project_build',
      label: trans('menu.project_build'),
      // Only enable if there are formats to export to
      enabled: dirObject.project.formats.length > 0
    })
  }

  // Finally, check for it being root
  if (dirObject.parent == null) {
    items.push({ type: 'separator' })
    items.push({
      id: 'menu.close_workspace',
      label: trans('menu.close_workspace'),
      enabled: true
    })
  }

  const point = { x: event.clientX, y: event.clientY }
  global.menuProvider.show(point, items, (clickedID) => {
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
