// This function displays a custom styled popup menu at the given coordinates

export default function showPopupMenu (posX: number, posY: number, items: AnyMenuItem[], callback: Function): Function {
  // Remove any possible former submenu
  const previousSubmenu = document.getElementById('application-menu')
  if (previousSubmenu !== null) {
    previousSubmenu.parentElement?.removeChild(previousSubmenu)
  }

  // We have just received a serialized submenu which we should now display
  const appMenu = document.createElement('div')
  appMenu.setAttribute('id', 'application-menu')
  appMenu.style.zIndex = '99999' // Ensure it always stays on top of anything, including modals

  for (let item of items) {
    const menuItem = renderMenuItem(item)

    // If this is a submenu, the caller needs to register a different
    // event listener
    const secondarySubmenu = document.createElement('div')
    secondarySubmenu.classList.add('secondary-menu')

    if (item.type !== 'submenu' && item.type !== 'separator' && item.enabled) {
      // Trigger a click on the "real" menu item in the back
      menuItem.addEventListener('click', (event) => {
        callback((item as NormalItem).id)
      })
    } else if (item.type === 'submenu' && item.enabled) {
      // Enable toggling (no click handler will be registered by the
      // render method if this is a submenu)
      menuItem.addEventListener('click', (event) => {
        event.stopPropagation()
        secondarySubmenu.classList.toggle('open')
      })
    }

    appMenu.appendChild(menuItem)

    // Zettlr menus support one level of submenu, which are immediately shown
    if (item.type === 'submenu') {
      for (let secondaryItem of item.submenu) {
        const subItem = renderMenuItem(secondaryItem)
        secondarySubmenu.appendChild(subItem)
      }

      appMenu.appendChild(secondarySubmenu)
    }
  }

  // Now position the element
  appMenu.style.left = `${posX}px`
  appMenu.style.top = `${posY}px`

  // Finally, append it to the DOM tree to display it
  document.body.appendChild(appMenu)

  return () => {
    // When the closing function is called, remove the menu again
    appMenu.parentElement?.removeChild(appMenu)
  }
}

/**
 * Renders a single submenu item
 *
 * @param   {any}          item          The item with necessary properties
 * @param   {string}       elementClass  An optional elementClass to apply to the container
 *
 * @return  {HTMLElement}                The rendered element
 */
function renderMenuItem (item: any, elementClass?: string): HTMLElement {
  // First create the item
  const menuItem = document.createElement('div')
  menuItem.classList.add('menu-item')
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
    let acc = item.accelerator
    // Make the accelerator system-specific
    acc = acc.replace('CmdOrCtrl', (process.platform === 'darwin') ? 'Cmd' : 'Ctrl')
    acc = acc.replace('CommandOrControl', (process.platform === 'darwin') ? 'Cmd' : 'Ctrl')

    // Some improvements to legibility
    acc = acc.replace('Command', 'Cmd')
    acc = acc.replace('Control', 'Ctrl')
    acc = acc.replace('Minus', '-')
    acc = acc.replace('Delete', 'Del')
    acc = acc.replace('Backspace', 'Del')

    // Replace some common keycodes with their correct symbols
    acc = acc.replace('Cmd', '⌘')
    acc = acc.replace('Shift', '⇧')
    acc = acc.replace('Alt', '⎇')
    acc = acc.replace('Option', '⎇')

    // Afterwards, remove all plus signs and replace them with spaces
    acc = acc.replace(/\+/g, ' ')
    acc = acc.replace('Plus', '+') // Obviously, needs to come afterwards
    accel.textContent = acc
    afterElement.appendChild(accel)
  }

  return menuItem
}
