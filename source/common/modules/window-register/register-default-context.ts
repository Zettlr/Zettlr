/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Default context menu handler
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file registers a few event listeners that will display
 *                  a default context menu for text input elements, containing
 *                  generic operations such as copy, cut, and paste.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { AnyMenuItem, Point } from '@dts/renderer/context'
const ipcRenderer = (window as any).ipc as Electron.IpcRenderer

const TEMPLATE: AnyMenuItem[] = [
  {
    id: 'cut',
    label: 'menu.cut',
    accelerator: 'CmdOrCtrl+X',
    type: 'normal',
    enabled: true
  },
  {
    id: 'copy',
    label: 'menu.copy',
    accelerator: 'CmdOrCtrl+C',
    type: 'normal',
    enabled: true
  },
  {
    id: 'paste',
    label: 'menu.paste',
    accelerator: 'CmdOrCtrl+V',
    type: 'normal',
    enabled: true
  },
  {
    type: 'separator'
  },
  {
    id: 'selectAll',
    label: 'menu.select_all',
    accelerator: 'CmdOrCtrl+A',
    type: 'normal',
    enabled: true
  }
]

// The following type-attributes can receive copy and paste commands
const TEXT_INPUT_TYPES = [
  'text',
  'password',
  'email',
  'number',
  'search',
  'tel',
  'url'
]

// Holds the current close callback
let currentCallback: Function|null = null

/**
 * Registers listeners for default context menus for anything text related
 */
export default function registerDefaultContextMenu (): void {
  window.addEventListener('contextmenu', (event) => {
    if (currentCallback !== null) {
      currentCallback()
      currentCallback = null
    }

    const target = event.target as HTMLElement
    let type = target.getAttribute('type')
    if (type === null) {
      type = ''
    } else {
      type = type.toLowerCase()
    }

    const isTextarea = target.tagName === 'TEXTAREA'
    const isInput = target.tagName === 'INPUT'
    const canReceive = TEXT_INPUT_TYPES.includes(type)

    if (isTextarea || (isInput && canReceive)) {
      displayContextMenu(event.clientX, event.clientY, target as HTMLInputElement)
    }
  })

  window.addEventListener('click', (event) => {
    if (currentCallback !== null) {
      currentCallback()
      currentCallback = null
    }
  })
}

function displayContextMenu (posX: number, posY: number, target: HTMLInputElement): void {
  // First build the menu
  const items: AnyMenuItem[] = []

  for (let element of TEMPLATE) {
    const buildItem: any = {}
    const modifies = element.type !== 'separator' && [ 'cut', 'paste' ].includes(element.id)

    switch (element.type) {
      case 'normal':
        buildItem.id = element.id
        buildItem.label = trans(element.label)
        buildItem.enabled = element.enabled
        buildItem.accelerator = element.accelerator
        buildItem.type = element.type
        break
      case 'checkbox':
      case 'radio':
        buildItem.id = element.id
        buildItem.label = trans(element.label)
        buildItem.enabled = element.enabled
        buildItem.accelerator = element.accelerator
        buildItem.type = element.type
        buildItem.checked = element.checked
        break
      case 'separator':
        buildItem.type = element.type
        break
    }

    if (modifies && target.readOnly) {
      buildItem.enabled = false
    }

    items.push(buildItem)
  }

  const point: Point = { x: posX, y: posY }
  currentCallback = showPopupMenu(point, items, (clickedID: string) => {
    // In this easy instance, we can simply send the ID to main ...
    ipcRenderer.send('window-controls', { command: clickedID })
    // ... and re-focus the input
    target.focus()
  })
}
