const { trans } = require('../../../common/i18n')
const { ipcRenderer, shell, clipboard } = require('electron')

const TEMPLATE = [
  {
    label: 'menu.properties',
    id: 'properties',
    type: 'normal'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.rename_file',
    command: 'file-rename',
    accelerator: 'CmdOrCtrl+R',
    type: 'normal'
  },
  {
    label: 'menu.delete_file',
    command: 'file-delete',
    accelerator: 'CmdOrCtrl+Backspace',
    type: 'normal'
  },
  {
    label: 'menu.duplicate_file',
    type: 'normal'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.copy_filename',
    command: 'copy-to-clipboard',
    type: 'normal'
  },
  {
    label: 'menu.copy_id',
    command: 'copy-to-clipboard',
    type: 'normal'
  },
  {
    label: 'menu.quicklook',
    command: 'open-quicklook',
    type: 'normal'
  },
  {
    type: 'separator'
  },
  {
    label: 'menu.show_file',
    command: 'show-in-finder',
    type: 'normal'
  }
]

module.exports = function displayFileContext (event, fileObject, el, callback) {
  let items = []

  for (const item of TEMPLATE) {
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

    if ((fileObject.id == null || fileObject.id === '') && buildItem.id === 'menu.copy_id') {
      buildItem.enabled = false
    } else {
      buildItem.enabled = true // All checks passed: Enable
    }

    items.push(buildItem)
  }

  if (fileObject.parent == null) {
    items = items.concat([
      {
        type: 'separator'
      },
      {
        id: 'menu.close_file',
        label: trans('menu.close_file'),
        enabled: true
      }
    ])
  }

  const point = { x: event.clientX, y: event.clientY }
  global.menuProvider.show(point, items, (clickedID) => {
    callback(clickedID) // TODO
    switch (clickedID) {
      case 'menu.copy_filename':
        clipboard.writeText(fileObject.name)
        break
      case 'menu.copy_id':
        clipboard.writeText(fileObject.id)
        break
      case 'menu.quicklook':
        ipcRenderer.send('message', {
          command: 'open-quicklook',
          content: fileObject.hash
        })
        break
      case 'menu.show_file':
        shell.showItemInFolder(fileObject.path)
        break
    }
  })
}
