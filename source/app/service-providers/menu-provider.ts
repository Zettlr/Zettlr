/**
* @ignore
* BEGIN HEADER
*
* Contains:        MenuProvider
* CVM-Role:        Service Provider
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     Very basic wrapper around electron Menu class.
*
* END HEADER
*/

import {
  Menu,
  ipcMain,
  BrowserWindow
} from 'electron'

import broadcastIPCMessage from '../../common/util/broadcast-ipc-message'

// Import the menu constructors
import win32Menu from './assets/menu.win32'
import macOSMenu from './assets/menu.darwin'

// Types from the global.d.ts of the window-register module
interface CheckboxRadioItem {
  id: string
  label: string
  accelerator?: string
  role?: string
  type: 'checkbox'|'radio'
  enabled: boolean
  checked: boolean
}

interface SeparatorItem {
  type: 'separator'
}

interface SubmenuItem {
  id: string
  label: string
  type: 'submenu'
  role?: string
  enabled: boolean
  submenu: Array<CheckboxRadioItem|SeparatorItem|SubmenuItem|NormalItem>
}

interface NormalItem {
  id: string
  label: string
  accelerator?: string
  role?: string
  type: 'normal'
  enabled: boolean
}

type AnyMenuItem = CheckboxRadioItem | SeparatorItem | SubmenuItem | NormalItem

// Any menu item w/o separators
// type InteractiveMenuItem = CheckboxRadioItem | SubmenuItem | NormalItem

const BLUEPRINTS = {
  // Currently we ship two different sets of menu items -- one for macOS, and
  // one for all other platforms. However, this setup enables us to in the
  // future fulfill more platforms' special needs, if it's necessary.
  win32: win32Menu,
  linux: win32Menu,
  darwin: macOSMenu,
  aix: win32Menu,
  android: win32Menu,
  freebsd: win32Menu,
  openbsd: win32Menu,
  sunos: win32Menu,
  cygwin: win32Menu,
  netbsd: win32Menu
}

/**
* This class generates the menu based upon the menu.tpl.json as well as additional
* config variables and the platform.
*/
export default class MenuProvider {
  /**
   * Keeps track of the state of checkboxes which are not controlled by a
   * configuration setting.
   */
  _checkboxState: any

  /**
  * Creates the main application menu and sets it.
  */
  constructor () {
    this._checkboxState = Object.create(null)

    // Begin listening to configuration update events that announce a change in
    // the recent docs list so that we can make sure the menu is always updated.
    global.recentDocs.on('update', () => { this.set() })
    global.config.on('update', () => { this.set() })

    ipcMain.on('menu-provider', (event, message) => {
      const { command } = message

      if (command === 'get-application-menu') {
        event.reply('menu-provider', {
          command: 'application-menu',
          payload: this.serializableApplicationMenu
        })
      } else if (command === 'get-application-submenu') {
        const itemID = message.payload as string
        const appMenu = Menu.getApplicationMenu()
        if (appMenu === null) {
          // Cannot send submenu: No menu set
          return
        }

        // Send the serialized submenu to the renderer
        const menuItem = appMenu.getMenuItemById(itemID)
        event.reply('menu-provider', {
          command: 'application-submenu',
          payload: {
            id: itemID,
            submenu: (this._makeItemSerializable(menuItem) as SubmenuItem).submenu
          }
        })
      } else if (command === 'click-menu-item') {
        const itemID = message.payload as string

        const appMenu = Menu.getApplicationMenu()
        if (appMenu === null) {
          global.log.error(`[Menu Provider] Could not trigger a click on item ${itemID}: No menu set.`)
          return
        }

        const menuItem = appMenu.getMenuItemById(itemID)

        if (menuItem === null) {
          global.log.error(`[Menu Provider] Could not rigger a click on item ${itemID}: No item found.`)
          return
        }

        // And now trigger a click! We need to pass the menuItem and the
        // focusedWindow as well.
        const focusedWindow = BrowserWindow.getFocusedWindow()
        menuItem.click(menuItem, focusedWindow)
      }
    })
  }

  /**
   * Shuts down the provider
   *
   * @return  {boolean} Always returns true
   */
  shutdown (): boolean {
    global.log.verbose('Menu provider shutting down ...')
    return true // This provider needs no special shutdown logic
  }

  /**
   * Turns a MenuItem into a serializable metadata object for sending through IPC
   *
   * @param   {MenuItem}  menuItem  The menu item to serialize
   *
   * @return  {any}            The serialized item
   */
  _makeItemSerializable (menuItem: any): AnyMenuItem {
    let serializableItem: any = {
      label: menuItem.label,
      id: menuItem.id,
      type: menuItem.type,
      accelerator: menuItem.accelerator,
      enabled: menuItem.enabled
    }

    // Also indicate checked-status
    if ([ 'checkbox', 'radio' ].includes(menuItem.type)) {
      serializableItem.checked = menuItem.checked
    }

    if (menuItem.submenu != null) {
      serializableItem.submenu = []
      // menuItem.submenu is a Menu instance containing items in this property
      for (let subItem of menuItem.submenu.items) {
        serializableItem.submenu.push(this._makeItemSerializable(subItem))
      }
    }

    return serializableItem
  }

  /**
   * Generates the application menu from the blueprint.
   */
  _build (): Menu {
    const blueprint = BLUEPRINTS[process.platform]()
    // Last but not least build the template
    return Menu.buildFromTemplate(blueprint)
  }

  /**
   * Gets the application menu in a serializable state which can be sent through
   * IPC calls or saved as JSON.
   *
   * @return  {AnyMenuItem[]}  The serialized items
   */
  get serializableApplicationMenu (): AnyMenuItem[] {
    const appMenu = Menu.getApplicationMenu()
    if (appMenu === null) {
      return []
    }

    const serialized = appMenu.items.map(item => {
      return this._makeItemSerializable(item)
    })

    return serialized
  }

  /**
   * Generates and sets the main application menu
   */
  set (): void {
    Menu.setApplicationMenu(this._build())
    // Notify all open windows of a new menu, so that they can
    // adapt their settings.
    broadcastIPCMessage('menu-provider', {
      command: 'application-menu',
      payload: this.serializableApplicationMenu
    })
  }
}
