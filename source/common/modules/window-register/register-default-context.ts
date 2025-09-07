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
import showPopupMenu, { type AnyMenuItem, type Point } from '@common/modules/window-register/application-menu-helper'
const ipcRenderer = window.ipc

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
let currentCallback: null|(() => void) = null

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
  const items: AnyMenuItem[] = [
    {
      id: 'cut',
      label: trans('Cut'),
      accelerator: 'CmdOrCtrl+X',
      type: 'normal',
      enabled: !target.readOnly // Only enable if target is not readonly
    },
    {
      id: 'copy',
      label: trans('Copy'),
      accelerator: 'CmdOrCtrl+C',
      type: 'normal'
    },
    {
      id: 'paste',
      label: trans('Paste'),
      accelerator: 'CmdOrCtrl+V',
      type: 'normal',
      enabled: !target.readOnly // Only enable if target is not readonly
    },
    {
      type: 'separator'
    },
    {
      id: 'selectAll',
      label: trans('Select all'),
      accelerator: 'CmdOrCtrl+A',
      type: 'normal'
    }
  ]

  const point: Point = { x: posX, y: posY }
  currentCallback = showPopupMenu(point, items, (clickedID: string) => {
    // In this easy instance, we can simply send the ID to main ...
    ipcRenderer.send('window-controls', { command: clickedID })
    // ... and re-focus the input
    target.focus()
  })
}
