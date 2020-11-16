import { ipcRenderer } from 'electron'

// This function displays a custom styled popup menu at the given coordinates
export default function showPopupMenu (position: Point|Rect, items: AnyMenuItem[], callback: Function): Function {
  // Get the correct rect to use for submenu placement
  let targetRect: Rect = {
    top: 0,
    left: 0,
    width: 0,
    height: 0
  }

  if (position.hasOwnProperty('width') && position.hasOwnProperty('height')) {
    targetRect = position as Rect
  } else {
    // A point is basically a rect with no width or height
    targetRect.top = (position as Point).y
    targetRect.left = (position as Point).x
  }

  // We have just received a serialized submenu which we should now display
  const appMenu = document.createElement('div')
  appMenu.setAttribute('id', 'application-menu')
  appMenu.style.zIndex = '99999' // Ensure it always stays on top of anything, including modals

  for (let item of items) {
    const menuItem = renderMenuItem(item)

    if (item.type !== 'submenu' && item.type !== 'separator' && item.enabled) {
      // Trigger a click on the "real" menu item in the back
      menuItem.addEventListener('mousedown', (event) => {
        event.preventDefault()
        event.stopPropagation()
        callback((item as NormalItem).id)
        appMenu.parentElement?.removeChild(appMenu) // Close the menu
      })
    } else if (item.type === 'submenu' && item.enabled) {
      // Enable displaying the sub menu
      let closeSubmenu: Function|null = null

      appMenu.addEventListener('mousemove', (event: MouseEvent) => {
        const point = { x: event.clientX, y: event.clientY }
        const rect: DOMRect = menuItem.getBoundingClientRect()
        const menuRect: DOMRect = appMenu.getBoundingClientRect()
        if (pointInRect(point, rect) && closeSubmenu === null) {
          // It's on the menu item, so display the submenu. We need to pass a
          // rect for eventual moving to the other side of the menu item.
          const target: Rect = {
            left: rect.left,
            top: rect.top,
            width: rect.width,
            height: rect.height
          }
          closeSubmenu = showPopupMenu(target, (item as SubmenuItem).submenu, (clickedID: string) => {
            // Call the regular callback to basically "bubble up" the event
            callback(clickedID)
          })
        } else if (
          pointInRect(point, menuRect) &&
          !pointInRect(point, rect) &&
          closeSubmenu !== null
        ) {
          // It's within the menu but not over our item, so hide again
          closeSubmenu()
          closeSubmenu = null
        } // Else: Keep it open
      })
    }

    appMenu.appendChild(menuItem)
  }

  if (global.config.get('debug') === true) {
    // In debug mode, add an "inspect element" menu item to each and every
    // context menu that is being opened.
    const menuItem = renderMenuItem({
      id: 'inspect-element',
      label: 'Inspect Element',
      type: 'normal',
      enabled: true
    })

    menuItem.addEventListener('mousedown', (event) => {
      console.log('Inspecting!')
      ipcRenderer.send('window-controls', {
        command: 'inspect-element',
        payload: {
          // If we only have a point, width and height will be 0,
          // and 0/2 = 0 ¯\_(ツ)_/¯
          x: targetRect.left + targetRect.width / 2,
          y: targetRect.top + targetRect.height / 2
        }
      })
    })

    appMenu.appendChild(renderMenuItem({ type: 'separator' }))
    appMenu.appendChild(menuItem)
  }

  // Now, append it to the DOM tree to display it
  document.body.appendChild(appMenu)

  // After it's added we can correctly position it
  positionMenu(appMenu, targetRect)

  // Finally, add an event listener to determine if the user clicked somewhere
  // on the window, because this indicates that the menu should be closed.
  // Clicks on any menu item will be handled before the event bubbles up to the
  // window so we don't need additional checks.
  const clickCallback = (event?: MouseEvent): void => {
    appMenu.parentElement?.removeChild(appMenu)
    window.removeEventListener('mousedown', clickCallback)
  }
  window.addEventListener('mousedown', clickCallback)

  // Return a close-callback for the caller to programmatically close the menu
  return () => {
    // When the closing function is called, remove the menu again
    clickCallback()
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
function renderMenuItem (item: AnyMenuItem, elementClass?: string): HTMLElement {
  // First create the item
  const menuItem = document.createElement('div')
  menuItem.classList.add('menu-item')
  if (item.type !== 'separator' && !item.enabled) {
    menuItem.classList.add('disabled')
  }

  menuItem.classList.add(item.type)
  if (item.hasOwnProperty('id')) {
    menuItem.dataset.id = (item as NormalItem).id
  }

  // In case the caller wants an additional class on the item
  if (elementClass !== undefined) {
    menuItem.classList.add(elementClass)
  }

  // Then the optional status element
  const statusElement = document.createElement('div')
  statusElement.classList.add('status')
  menuItem.appendChild(statusElement)

  // Specials for checkboxes and radios
  if (item.type === 'checkbox' && item.checked) {
    const icon = document.createElement('clr-icon')
    icon.setAttribute('shape', 'check')
    statusElement.appendChild(icon)
  } else if (item.type === 'radio') {
    const icon = document.createElement('clr-icon')
    icon.setAttribute('shape', (item.checked) ? 'dot-circle' : 'circle')
    statusElement.appendChild(icon)
  }

  const labelElement = document.createElement('div')
  labelElement.classList.add('label')
  if (item.type !== 'separator') {
    labelElement.textContent = item.label
  }
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
  } else if (item.type !== 'separator' && item.accelerator != null) {
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

    // Replace some common keycodes with their correct symbols
    acc = acc.replace('Cmd', '⌘')
    acc = acc.replace('Shift', '⇧')
    if (process.platform === 'darwin') {
      acc = acc.replace('Alt', '⎇')
      acc = acc.replace('Option', '⎇')
    }

    acc = acc.replace('Backspace', '←')
    acc = acc.replace('Tab', '↹')

    // Afterwards, remove all plus signs for macOS. Windows and Linux still
    // use Plus-signs to display accelerators
    if (process.platform === 'darwin') {
      acc = acc.replace(/\+/g, ' ') // Use a thin space (U+2009)
      acc = acc.replace('Plus', '+') // Obviously, needs to come last
    }

    accel.textContent = acc
    afterElement.appendChild(accel)
  }

  return menuItem
}

/**
 * Determines if a point is within the given rect
 *
 * @param   {Point}    point  The point
 * @param   {Rect}     rect   The rect
 *
 * @return  {boolean}         True, if the point is within the rect
 */
function pointInRect (point: Point, rect: Rect): boolean {
  return (
    point.x > rect.left &&
    point.x < rect.left + rect.width &&
    point.y > rect.top &&
    point.y < rect.top + rect.height
  )
}

/**
 * Positions a menu correctly on the screen so that it is completely visible.
 *
 * @param   {HTMLElement}  menu    The menu to position
 * @param   {Rect}         target  The target rectancle
 */
function positionMenu (menu: HTMLElement, target: Rect): void {
  // Now position the element: First generally where it is supposed to be.
  menu.style.top = `${target.top}px`
  menu.style.left = `${target.left + target.width}px`
  const bounds = menu.getBoundingClientRect()

  const spaceToTheLeft = bounds.x
  const spaceToTheRight = window.innerWidth - bounds.right
  const isTooHigh = bounds.height > window.innerHeight

  // Second, we have to check if it's on the right side. If not, and if on the
  // other side is more space, swap it to there.
  if (bounds.right > window.innerWidth && spaceToTheRight < spaceToTheLeft) {
    // Swap the menu to the other side
    menu.style.left = `${target.left - bounds.width}px`
  }

  // Third, check the height: Move it up until it's aligned with the bottom.
  if (bounds.bottom > window.innerHeight && !isTooHigh) {
    // Apply a margin of 10 pixels to not clutch it somewhere at the bottom
    menu.style.top = `${window.innerHeight - bounds.height - 10}px`
  } else if (isTooHigh) {
    // Crunch it together (also apply a margin of 10px again)
    menu.style.top = '10px'
    menu.style.height = `${window.innerHeight - 20}px`
  }
}
