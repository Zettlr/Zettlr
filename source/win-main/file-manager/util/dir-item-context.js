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

const { trans } = require('../../../common/i18n-renderer')

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
  },
  {
    label: 'menu.set_icon',
    command: 'select-icon'
  },
  {
    type: 'separator'
  }
]

const NOT_FOUND_TEMPLATE = [
  {
    id: 'menu.rescan_dir',
    label: 'menu.rescan_dir',
    enabled: true
  }
]

module.exports = function displayFileContext (event, dirObject, el, callback) {
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
    items = items.concat([{
      id: 'menu.project_properties',
      label: trans('menu.project_properties'),
      enabled: true
    },
    {
      id: 'menu.project_build',
      label: trans('menu.project_build'),
      enabled: true
    }])
  }

  // Finally, check for it being root
  if (dirObject.parent == null) {
    items = items.concat([
      {
        type: 'separator'
      },
      {
        id: 'menu.close_workspace',
        label: trans('menu.close_workspace'),
        enabled: true
      }
    ])
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
      case 'menu.project_properties':
        ipcRenderer.send('message', {
          command: 'dir-project-properties',
          content: { hash: dirObject.hash }
        })
        break
      case 'menu.project_build':
        ipcRenderer.send('message', {
          command: 'dir-project-export',
          content: { hash: dirObject.hash }
        })
        break
      case 'menu.close_workspace':
        ipcRenderer.send('message', {
          command: 'root-close',
          content: dirObject.hash
        })
        break
      case 'menu.rescan_dir':
        ipcRenderer.send('message', {
          command: 'rescan-dir',
          content: dirObject.hash
        })
    }
  })
}
