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
    command: 'file-duplicate',
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
      case 'menu.delete_file':
        ipcRenderer.send('message', {
          command: 'file-delete',
          content: { hash: fileObject.hash }
        })
        break
      case 'menu.duplicate_file':
        displayDuplicatePopup(fileObject, el)
        break
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
      case 'menu.close_file':
        ipcRenderer.send('message', {
          command: 'root-close',
          content: fileObject.hash
        })
        break
    }
  })
}

function displayDuplicatePopup (file, element) {
  const data = {
    'val': 'Copy of ' + file.name,
    'placeholder': trans('dialog.file_new.placeholder')
  }

  global.popupProvider.show('textfield', element, data, (form) => {
    if (form !== null) {
      global.ipc.send('file-duplicate', {
        'dir': (file.parent != null) ? file.parent.hash : null,
        'file': file.hash,
        'name': form[0].value
      })
    }
  })
}
