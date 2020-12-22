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
  app,
  Menu,
  ipcMain,
  BrowserWindow,
  shell,
  MenuItemConstructorOptions
} from 'electron'

import path from 'path'
import { trans } from '../../common/i18n.js'
import broadcastIPCMessage from '../../common/util/broadcast-ipc-message'

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
  win32: require('./assets/menu.win32.json'),
  linux: require('./assets/menu.win32.json'),
  darwin: require('./assets/menu.darwin.json'),
  aix: require('./assets/menu.win32.json'),
  android: require('./assets/menu.win32.json'),
  freebsd: require('./assets/menu.win32.json'),
  openbsd: require('./assets/menu.win32.json'),
  sunos: require('./assets/menu.win32.json'),
  cygwin: require('./assets/menu.win32.json'),
  netbsd: require('./assets/menu.win32.json')
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
   * Generates a menu from the blueprint template source.
   * @param  {MenuItemConstructorOptions} menutpl The template to process
   * @return {MenuItemConstructorOptions}         The ready menu
   */
  _buildFromSource (menutpl: MenuItemConstructorOptions): MenuItemConstructorOptions {
    let menu: MenuItemConstructorOptions = {}

    // First, assign the correct type
    menu.type = menutpl.type

    // First, we need the label, if applicable
    if (menutpl.type !== 'separator') {
      if (menutpl.label !== 'Zettlr') {
        menu.label = trans(menutpl.label as string)
      } else {
        menu.label = 'Zettlr'
      }
    } else {
      // Easy if we have a separator
      return menutpl
    }

    // Top level menus can also have a role (window or help)
    if (menutpl.role !== undefined) {
      menu.role = menutpl.role as MenuItemConstructorOptions['role']
    }

    // Every menu item needs an ID
    if (menutpl.id !== undefined) {
      menu.id = menutpl.id
    } else if ((menutpl as any).type !== 'separator') {
      // In case there's no special ID, take the label translation string, which
      // is in any case safe for transportation in any way (= ASCII only)
      menu.id = menutpl.label
    }

    // Accelerators are optional
    if (menutpl.accelerator !== undefined) {
      menu.accelerator = menutpl.accelerator
    }

    // Weblinks are "target"s
    if ((menutpl as any).target !== undefined) {
      menu.click = function (menuitem, focusedWindow) {
        const target = (menutpl as any).target as string
        shell.openExternal(target).catch(e => {
          global.log.error(`[Menu Provider] Cannot open target: ${target}`, e.message)
        })
      }
    }

    // Commands need to be simply sent to the renderer
    if ((menutpl as any).command !== undefined) {
      menu.click = function (menuItem, focusedWindow) {
        global.ipc.send((menutpl as any).command)
      }
    }

    // Checkboxes can be checked based on a config value
    if (menutpl.checked !== undefined && (menutpl as any).checked !== 'null') {
      menu.checked = global.config.get(menutpl.checked)
    } else if (menutpl.checked !== undefined && (menutpl as any).checked === 'null') {
      // If it's null, simply preset with false and add it to the checkboxState
      // property so the status can be tracked across instantiations
      if (this._checkboxState[menu.id as string] !== undefined) {
        menu.checked = this._checkboxState[menu.id as string]
      } else {
        menu.checked = false
        this._checkboxState[menu.id as string] = false
      }

      const state = this._checkboxState

      // Re-define the click handler to keep track of the checkboxState
      // NOTE/ATTENTION: This means that every "checked"-menuitem MUST have
      // a command property. Right now this is the case, but double-check
      menu.click = function (menuItem, focusedWindow) {
        global.ipc.send((menutpl as any).command)
        state[menu.id as string] = !(state[menu.id as string] as boolean)
      }
    }

    // Custom quit item
    if (menutpl.id === 'menu-quit') {
      menu.click = function (item, focusedWindow) {
        if (focusedWindow != null) {
          focusedWindow.webContents.send('message', { 'command': 'app-quit' })
        } else {
          // If this part is executed it means there's no window, so simply quit.
          app.quit()
        }
      }
    }

    // Methods are specialised commands that need to be hardcoded here.
    if ((menutpl as any).zettlrRole !== undefined) {
      switch ((menutpl as any).zettlrRole) {
        case 'minimize':
          menu.click = function (menuitem, focusedWindow) {
            focusedWindow?.minimize()
          }
          break
        case 'reloadWindow':
          menu.click = function (menuitem, focusedWindow) {
            if (focusedWindow != null) focusedWindow.reload()
          }
          break
        case 'toggleDevTools':
          menu.click = function (menuitem, focusedWindow) {
            if (focusedWindow != null) focusedWindow.webContents.toggleDevTools()
          }
          break
        case 'openLogViewer':
          menu.click = function (menuitem, focusedWindow) {
            global.log.showLogViewer()
          }
          break
        case 'openDictData':
          menu.click = function (menuitem, focusedWindow) {
            shell.openPath(path.join(app.getPath('userData'), '/dict'))
              .then(potentialError => {
                if (potentialError !== '') {
                  global.log.error('Could not open dictionary directory:' + potentialError)
                }
              })
              .catch(err => {
                global.log.error(`[Menu Provider] Could not open the dictionary directory: ${err.message as string}`, err)
              })
          }
          break
        // Enumerate the recent docs
        case 'recent-docs':
          menu.submenu = [{
            id: 'menu.clear_recent_docs',
            label: trans('menu.clear_recent_docs'),
            click: (item, win) => { global.recentDocs.clear() }
          }, { type: 'separator' }]
          // Disable if there are no recent docs
          if (global.recentDocs.hasDocs()) menu.submenu[0].enabled = false
          // Get the most recent 10 documents
          for (let recent of global.recentDocs.get().slice(0, 10)) {
            menu.submenu.push({
              id: recent.name,
              label: recent.name,
              click: function (menuitem, focusedWindow) {
                if ((global as any).mainWindow != null) {
                  (global as any).mainWindow.webContents.send('message', { 'command': 'file-get', 'content': recent.hash })
                } else if (focusedWindow != null) {
                  focusedWindow.webContents.send('message', { 'command': 'file-get', 'content': recent.hash })
                }
              }
            })
          }
          break
      }
    }

    // Recursively build a submenu, if applicable.
    if (menutpl.submenu !== undefined) {
      menu.submenu = []
      for (let item of menutpl.submenu as MenuItemConstructorOptions[]) {
        menu.submenu.push(this._buildFromSource(item))
      }
    }

    return menu
  }

  /**
   * Generates the application menu from the blueprint.
   */
  _build (): Menu {
    const blueprint = BLUEPRINTS[process.platform]
    let mainMenu: MenuItemConstructorOptions[] = [
      this._buildFromSource(blueprint.file),
      this._buildFromSource(blueprint.edit),
      this._buildFromSource(blueprint.view),
      this._buildFromSource(blueprint.window),
      this._buildFromSource(blueprint.help)
    ]

    if (global.config.get('debug') as boolean) {
      mainMenu.splice(3, 0, this._buildFromSource(blueprint.debug))
    }
    if (process.platform === 'darwin') {
      mainMenu.unshift(this._buildFromSource(blueprint.app))
    }

    // Last but not least build the template
    return Menu.buildFromTemplate(mainMenu)
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
