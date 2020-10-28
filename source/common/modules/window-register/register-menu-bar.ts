import { ipcRenderer } from 'electron'

var currentSubMenu: string|null = null

var applicationMenu: SubmenuItem[]|null = null

var menuCloseCallback: Function|null = null

/**
 * This function registers and handles the menu bar if requested by the design
 */
export default function registerMenubar (shouldShowMenubar: boolean): void {
  // First, determine if the menubar should be shown at all
  const usesNativeAppearance: boolean = global.config.get('window.nativeAppearance')
  if (usesNativeAppearance || !shouldShowMenubar) {
    return
  }

  // Show the menubar
  document.body.classList.add('show-menubar')

  send('get-application-menu') // Request an initial batch of top level items

  ipcRenderer.on('menu-provider', (event, message) => {
    const { command } = message

    if (command === 'application-menu') {
      const { payload } = message
      applicationMenu = payload
      setMenu()
    }
  })

  window.addEventListener('mousedown', (event) => {
    // The closing will be handled automatically by the menu handler
    if (menuCloseCallback !== null) {
      menuCloseCallback = null
      currentSubMenu = null
    }
  })

  window.addEventListener('mousemove', (event) => {
    const menubar = document.getElementById('menubar')
    if (menuCloseCallback === null || menubar === null) {
      // Neither menubar nor submenu, so nothing to do
      return
    }

    const menuRect = menubar.getBoundingClientRect()
    const target = event.target as HTMLElement
    const id = (event.target as HTMLElement)?.dataset.id

    // We do not need to do anything if ...
    if (
      event.clientY > menuRect.height ||
      target === null ||
      !target.classList.contains('top-level-item') ||
      currentSubMenu === id ||
      applicationMenu === null
    ) {
      return
    }

    // Close a previous menu if applicable.
    if (menuCloseCallback !== null) {
      menuCloseCallback()
    }

    // Exchange the submenu
    const targetItem = applicationMenu.find(elem => elem.id === id)
    if (targetItem != null) {
      showSubmenu(targetItem.submenu, targetItem.id)
    }
  })
}

/**
 * Convenience function to save some typing in this module
 *
 * @param   {string}  command  The command to send
 * @param   {any}     payload  The payload
 */
function send (command: string, payload: any = {}): void {
  ipcRenderer.send('menu-provider', { command, payload })
}

/**
 * Sets the menubar with the given items
 *
 * @param   {any[]}  items  The items, containing label & id properties
 */
function setMenu (): void {
  const menubar = document.getElementById('menubar')
  if (menubar === null) {
    return
  }

  // Reset
  menubar.innerHTML = ''

  // Do not re-add if application menu is null
  if (applicationMenu === null) {
    return
  }

  // Re-add
  for (let item of applicationMenu) {
    let element = document.createElement('span')
    element.classList.add('top-level-item')
    element.textContent = item.label
    element.dataset.id = item.id

    element.addEventListener('mousedown', (event) => {
      event.preventDefault()
      event.stopPropagation()
      showSubmenu(item.submenu, item.id)
    })

    menubar.appendChild(element)
  }
}

/**
 * Displays a submenu of a top-level menu item
 *
 * @param   {MenuItem[]}  items     The items in serialized form
 * @param   {string}      attachTo  The MenuItem.id of the item to attach to
 */
function showSubmenu (items: AnyMenuItem[], attachTo: string): void {
  const targetElement = document.querySelector(`#menubar .top-level-item[data-id=${attachTo}]`)
  const rect = targetElement?.getBoundingClientRect()
  if (rect === undefined) {
    return console.error('Cannot show application menu: Target has not been found!')
  }

  // Reset the application menu if shown
  if (menuCloseCallback !== null) {
    menuCloseCallback()
    menuCloseCallback = null
    currentSubMenu = null
  }

  if (currentSubMenu === attachTo) {
    // Emulate a toggle by not showing the same submenu again
    return
  }

  // Display a new menu
  const point: Point = { x: rect.left, y: rect.top + rect.height }
  menuCloseCallback = global.menuProvider.show(point, items, (clickedID: string) => {
    // Trigger a click on the "real" menu item in the back
    send('click-menu-item', clickedID)
  })

  // Save the original ID for easy access
  currentSubMenu = attachTo
}
