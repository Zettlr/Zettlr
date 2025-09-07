<template>
  <div id="menubar">
    <span
      v-for="(item, idx) in menu"
      v-bind:key="idx"
      class="top-level-item"
      v-on:mousedown.stop.prevent="getSubmenu(item.id, $event.target as HTMLElement)"
      v-on:mouseenter.stop="maybeExchangeSubmenu(item.id, $event.target as HTMLElement)"
    >
      {{ item.label }}
    </span>
  </div>
</template>

<script setup lang="ts">
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Menubar
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Displays a custom-styled menu bar on non-macOS platforms.
 *
 * END HEADER
 */

import showPopupMenu, { type AnyMenuItem, type SubmenuItem } from '@common/modules/window-register/application-menu-helper'
import { ref, onBeforeMount } from 'vue'

const ipcRenderer = window.ipc

const menu = ref<SubmenuItem[]>([])
const currentSubmenu = ref<string|null>(null)
const menuCloseCallback = ref<null|(() => void)|null>(null)

// Can contain a target if a submenu is right now being requested
const targetElement = ref<HTMLElement|null>(null)

onBeforeMount(() => {
  // Listen to messages from the menu provider
  type MenuMessage = { command: 'application-menu', payload: SubmenuItem[] }
  type SubmenuMessage = { command: 'application-submenu', payload: { id: string, submenu: SubmenuItem[] } }

  ipcRenderer.on('menu-provider', (event, { command, payload }: MenuMessage|SubmenuMessage) => {
    if (command === 'application-menu') {
      menu.value = payload
    } else if (command === 'application-submenu') {
      showSubmenu(payload.submenu, payload.id)
    }
  })

  // Send an initial request
  ipcRenderer.send('menu-provider', { command: 'get-application-menu' })

  // Also make sure to reset the internal state if necessary
  window.addEventListener('mousedown', (_event) => {
    // The closing will be handled automatically by the menu handler
    if (menuCloseCallback.value !== null) {
      menuCloseCallback.value = null
      currentSubmenu.value = null
    }
  })
})

function getSubmenu (menuID: string, target: HTMLElement): void {
  targetElement.value = target
  ipcRenderer.send('menu-provider', {
    command: 'get-application-submenu',
    payload: menuID
  })
}

function maybeExchangeSubmenu (menuID: string, targetElement: HTMLElement): void {
  if (currentSubmenu.value === null) {
    return
  }

  if (currentSubmenu.value !== menuID) {
    getSubmenu(menuID, targetElement)
  }
}

/**
 * Displays a submenu of a top-level menu item
 *
 * @param   {AnyMenuItem[]}  items     The items in serialized form
 * @param   {string}      attachTo  The MenuItem.id of the item to attach to
 */
function showSubmenu (items: AnyMenuItem[], attachTo: string): void {
  if (targetElement.value === null) {
    return console.error('Cannot show application menu: Target item has not been found.')
  }

  const rect = targetElement.value.getBoundingClientRect()
  if (rect === undefined) {
    return console.error('Cannot show application menu: Target has not been found!')
  }

  // Reset the application menu if shown
  if (menuCloseCallback.value !== null) {
    menuCloseCallback.value()
    menuCloseCallback.value = null
  }

  if (currentSubmenu.value === attachTo) {
    // Emulate a toggle by not showing the same submenu again
    currentSubmenu.value = null
    return
  }

  // Display a new menu
  const point = { x: rect.left, y: rect.top + rect.height }
  menuCloseCallback.value = showPopupMenu(point, items, (clickedID) => {
    // Trigger a click on the "real" menu item in the back
    ipcRenderer.send('menu-provider', {
      command: 'click-menu-item',
      payload: clickedID
    })

    // Reset the menu state, since the callback indicates the menu is now
    // closed.
    menuCloseCallback.value = null
    currentSubmenu.value = null
  })

  // Save the original ID for easy access
  currentSubmenu.value = attachTo
  targetElement.value = null // Reset
}
</script>

<style lang="less">
// Styles for the menubar (for Windows and Linux)
#menubar {
  height: 31px;
  width: 100%;
  // Use the system font with a somewhat smaller font-size
  font-family: inherit;
  font-size: 12px;
  padding-left: 30px;
  // Use the Zettlr logo as fixed background to enable branding in the menubar
  background-image: url("../../img/image-preview.png");
  background-position: left center;
  background-repeat: no-repeat;
  background-size: contain;

  // If the menubar is shown, this indicates there's no title bar, hence we
  // need the menubar to be draggable.
  -webkit-app-region: drag;

  span.top-level-item {
    display: inline-block;
    padding: 3px;
    height: 31px;
    line-height: 31px;
    padding: 0 10px;
    // Don't drag the top-level menubar items
    -webkit-app-region: no-drag;
  }
}

body.win32 {
  #menubar {
    background-color: var(--system-accent-color, --c-primary);
    color: var(--system-accent-color-contrast);

    span.top-level-item:hover {
      // Since we can't be sure which colour the menu bar will have, simply add a transparent overlay
      background-color: rgba(0, 0, 0, .3);
    }
  }
}

body.linux {
  #menubar {
    background-color: rgb(180, 180, 180);
    color: rgb(30, 30, 30);

    span.top-level-item:hover {
      background-color: rgba(0, 0, 0, .3);
    }
  }

  &.dark #menubar {
    background-color: rgb(30, 30, 30);
    color: rgb(235, 235, 235);
  }
}
</style>
