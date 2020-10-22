import { ipcRenderer } from 'electron'

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
 * Renders a single submenu item
 *
 * @param   {any}          item          The item with necessary properties
 * @param   {string}       elementClass  An optional elementClass to apply to the container
 *
 * @return  {HTMLElement}                The rendered element
 */
function renderSubmenuItem (item: any, elementClass?: string): HTMLElement {
  // First create the item
  const menuItem = document.createElement('div')
  menuItem.classList.add('submenu-item')
  if (item.enabled === false) menuItem.classList.add('disabled')
  menuItem.classList.add(item.type)
  menuItem.dataset.id = item.id

  // In case the caller wants an additional class on the item
  if (elementClass !== undefined) menuItem.classList.add(elementClass)

  // Then the optional status element
  const statusElement = document.createElement('div')
  statusElement.classList.add('status')
  menuItem.appendChild(statusElement)

  // Specials for checkboxes and radios
  if (item.type === 'checkbox' && item.checked === true) {
    const icon = document.createElement('clr-icon')
    icon.setAttribute('shape', 'check')
    statusElement.appendChild(icon)
  } else if (item.type === 'radio') {
    const icon = document.createElement('clr-icon')
    if (item.checked === true) {
      icon.setAttribute('shape', 'dot-circle')
    } else {
      icon.setAttribute('shape', 'circle')
    }
    statusElement.appendChild(icon)
  }

  const labelElement = document.createElement('div')
  labelElement.classList.add('label')
  labelElement.textContent = item.label
  menuItem.appendChild(labelElement)

  // After the label, an additional accelerator (or submenu) indicator
  const afterElement = document.createElement('div')
  afterElement.classList.add('after-element')
  menuItem.appendChild(afterElement)

  if (item.type === 'submenu') {
    const submenuIndicator = document.createElement('clr-icon')
    submenuIndicator.setAttribute('shape', 'angle')
    submenuIndicator.setAttribute('dir', 'right')
    afterElement.appendChild(submenuIndicator)
  } else if (item.accelerator != null) {
    const accel = document.createElement('span')
    accel.textContent = item.accelerator
    afterElement.appendChild(accel)
  }

  // If this is a submenu, the caller needs to register a different
  // event listener
  if (item.type !== 'submenu' && item.enabled === true) {
    // Trigger a click on the "real" menu item in the back
    menuItem.addEventListener('click', (event) => {
      send('click-menu-item', item.id)
    })
  }

  return menuItem
}

/**
 * Sets the menubar with the given items
 *
 * @param   {any[]}  items  The items, containing label & id properties
 */
function setMenubar (items: any[]): void {
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
 * @param   {any[]}   items     The items in serialized form
 * @param   {string}  attachTo  The MenuItem.id of the item to attach to
 */
function showMenu (items: any[], attachTo: string): void {
  // Remove any possible former submenu
  const previousSubmenu = document.getElementById('submenu')
  if (previousSubmenu !== null) {
    previousSubmenu.parentElement?.removeChild(previousSubmenu)
  }

  if (items.length === 0) return // No submenu to show :(

  // We have just received a serialized submenu which we should now display
  const submenu = document.createElement('div')
  submenu.setAttribute('id', 'submenu')
  submenu.dataset.id = attachTo // Save the original ID for easy access

  for (let item of items) {
    const menuItem = renderSubmenuItem(item)

    submenu.appendChild(menuItem)

    // Zettlr menus support one level of submenu, which are immediately shown
    if (item.type === 'submenu') {
      const secondarySubmenu = document.createElement('div')
      secondarySubmenu.classList.add('secondary-menu')
      for (let secondaryItem of item.submenu) {
        const subItem = renderSubmenuItem(secondaryItem)
        secondarySubmenu.appendChild(subItem)
      }

      // Enable toggling (no click handler will be registered by the
      // render method if this is a submenu)
      menuItem.addEventListener('click', (event) => {
        event.stopPropagation()
        secondarySubmenu.classList.toggle('open')
      })

      submenu.appendChild(secondarySubmenu)
    }
  }

  // Now position the element
  const targetElement = document.querySelector(`#menubar .top-level-item[data-id=${attachTo}]`)
  const rect = targetElement?.getBoundingClientRect()
  if (rect === undefined) {
    return console.error('Cannot show submenu: Target has not been found!')
  }
  submenu.style.top = `${rect.top + rect.height}px`
  submenu.style.left = `${rect.left}px`

  document.body.appendChild(submenu)
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
    const submenu = document.getElementById('submenu')
    // On click, remove the submenu again

    if (submenu !== null) {
      submenu.parentElement?.removeChild(submenu)
    }
  })

  window.addEventListener('mousemove', (event) => {
    const menubar = document.getElementById('menubar')
    const submenu = document.getElementById('submenu')
    if (menubar === null || submenu === null) {
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
        if (submenu.dataset.id !== target.dataset.id) {
          // Exchange the submenu
          send('get-submenu', target.dataset.id)
        }
      }
    }
  })
}
