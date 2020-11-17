const { trans } = require('../../../common/i18n')
const { ipcRenderer, shell } = require('electron')
const generateFileName = require('../../../common/util/generate-filename')

const TEMPLATE = [
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

module.exports = function displayFileContext (event, dirObject, el) {
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
    buildItem.enabled = true

    items.push(buildItem)
  }

  // Now check for a project
  if (dirObject.project === null) {
    items.push({
      id: 'menu.new_project',
      label: trans('menu.new_project'),
      enabled: true
    })
  } else {
    items = items.concat([{
      id: 'menu.remove_project',
      label: trans('menu.remove_project'),
      enabled: true
    },
    {
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
    switch (clickedID) {
      case 'menu.rename_dir':
        displayTextPopup(dirObject.name, trans('dialog.dir_rename.placeholder'), el, (newValue) => {
          ipcRenderer.send('message', {
            command: 'dir-rename',
            content: { hash: dirObject.hash, name: newValue }
          })
        })
        break
      case 'menu.delete_dir':
        ipcRenderer.send('message', {
          command: 'dir-delete',
          content: { hash: dirObject.hash }
        })
        break
      case 'menu.new_file':
        displayTextPopup(generateFileName(), trans('dialog.file_rename.placeholder'), el, (newValue) => {
          ipcRenderer.send('message', {
            command: 'file-new',
            content: { hash: dirObject.hash, name: newValue }
          })
        })
        break
      case 'menu.new_dir':
        displayTextPopup('', trans('dialog.dir_new.placeholder'), el, (newValue) => {
          ipcRenderer.send('message', {
            command: 'dir-new',
            content: { hash: dirObject.hash, name: newValue }
          })
        })
        break
      case 'gui.attachments_open_dir':
        shell.showItemInFolder(dirObject.path)
        break
      case 'menu.set_icon':
        displayIconPopup(dirObject, el)
        break
      case 'menu.remove_project':
        ipcRenderer.send('message', {
          command: 'dir-remove-project',
          content: { hash: dirObject.hash }
        })
        break
      case 'menu.new_project':
        ipcRenderer.send('message', {
          command: 'dir-new-project',
          content: { hash: dirObject.hash }
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
    }
  })
}

function displayTextPopup (value, placeholder, element, callback) {
  const data = {
    'val': value,
    'placeholder': placeholder
  }

  global.popupProvider.show('textfield', element, data, (form) => {
    if (form !== null) {
      callback(form[0].value)
    }
  })
}

function displayIconPopup (dirObject, element) {
  // Display the popup
  global.popupProvider.show('icon-selector', element)

  // Listen to clicks
  const popup = document.getElementById('icon-selector-popup')
  popup.addEventListener('click', (event) => {
    let target = event.target

    if (target.tagName === 'CLR-ICON') target = target.parentElement

    if (!target.classList.contains('icon-block')) {
      return
    }

    const icon = target.dataset.shape
    global.ipc.send('dir-set-icon', {
      'hash': dirObject.hash,
      'icon': (icon === '__reset') ? null : icon
    })

    // Close & dereference
    global.popupProvider.close()
  })
}
