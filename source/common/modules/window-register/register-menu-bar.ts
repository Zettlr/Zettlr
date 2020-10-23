import { ipcRenderer } from 'electron'

var currentSubMenu: string|null = null

var menuCloseCallback: Function|null = null

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
function setMenubar (items: SubmenuItem[]): void {
  const menubar = document.getElementById('menubar')
  if (menubar === null) return

  // Reset
  menubar.innerHTML = ''

  // Re-add
  for (let item of items) {
    let element = document.createElement('span')
    element.classList.add('top-level-item')
    element.textContent = item.label
    element.dataset.id = item.id

    element.addEventListener('click', (event) => {
      send('get-submenu', element.dataset.id)
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
function showMenu (items: AnyMenuItem[], attachTo: string): void {
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

  // Display a new menu
  const point = { x: rect.left, y: rect.top + rect.height }
  menuCloseCallback = global.menuProvider.show(point, items, (clickedID: string) => {
    // Trigger a click on the "real" menu item in the back
    send('click-menu-item', clickedID)
  })

  // Save the original ID for easy access
  currentSubMenu = attachTo
}

/**
 * This function registers and handles the menu bar if requested by the design
 */
export default function registerMenubar (shouldShowMenubar: boolean): void {
  // First, determine if the menubar should be shown at all
  const usesNativeAppearance: boolean = global.config.get('window.nativeAppearance')
  if (usesNativeAppearance || !shouldShowMenubar) return

  // Show the menubar
  document.body.classList.add('show-menubar')

  send('get-top-level-items') // Request an initial batch of top level items

  ipcRenderer.on('menu-provider', (event, message) => {
    const { command } = message

    if (command === 'get-top-level-items') {
      const { payload } = message
      setMenubar(payload)
    } else if (command === 'get-submenu') {
      const { payload, menuItemId } = message
      showMenu(payload, menuItemId)
    }
  })

  window.addEventListener('click', (event) => {
    // The closing will be handled automatically by the menu
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

    // We have both menubar and submenu -> check if we need
    // to request another one

    const menuRect = menubar.getBoundingClientRect()
    if (event.clientY < menuRect.height) {
      // Cursor is over the menubar
      const target = event.target as HTMLElement
      if (target?.classList.contains('top-level-item')) {
        // We got a top-level-item as the target
        if (currentSubMenu !== target.dataset.id) {
          // Exchange the submenu
          send('get-submenu', target.dataset.id)
        }
      }
    }
  })
}
