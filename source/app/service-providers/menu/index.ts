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
  BrowserWindow,
  MenuItemConstructorOptions,
  app
} from 'electron'

import broadcastIPCMessage from '@common/util/broadcast-ipc-message'

// Import the menu constructors
import win32Menu from './menu.win32'
import macOSMenu from './menu.darwin'
import ProviderContract from '../provider-contract'
import RecentDocumentsProvider from '../recent-docs'
import WindowProvider from '../windows'
import CommandProvider from '../commands'
import LogProvider from '../log'

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
  netbsd: win32Menu,
  haiku: win32Menu
}

/**
* This class generates the menu based upon the menu.tpl.json as well as additional
* config variables and the platform.
*/
export default class MenuProvider extends ProviderContract {
  /**
   * Keeps track of the state of checkboxes which are not controlled by a
   * configuration setting.
   */
  _checkboxState: Map<string, boolean>

  /**
  * Creates the main application menu and sets it.
  */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _recentDocs: RecentDocumentsProvider,
    private readonly _commands: CommandProvider,
    private readonly _windows: WindowProvider
  ) {
    super()
    this._checkboxState = new Map()

    // Begin listening to configuration update events that announce a change in
    // the recent docs list so that we can make sure the menu is always updated.
    this._config.on('update', () => { this.set() })
    if (![ 'darwin', 'win32' ].includes(process.platform)) {
      this._recentDocs.on('update', () => { this.set() })
    }

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
        if (menuItem === null) {
          this._logger.error(`[Menu Provider] Could not send app menu ${itemID}: No item found.`)
          return
        }

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
          this._logger.error(`[Menu Provider] Could not trigger a click on item ${itemID}: No menu set.`)
          return
        }

        const menuItem = appMenu.getMenuItemById(itemID)

        if (menuItem === null) {
          this._logger.error(`[Menu Provider] Could not trigger a click on item ${itemID}: No item found.`)
          return
        }

        // And now trigger a click! We need to pass the menuItem and the
        // focusedWindow as well.
        const focusedWindow = BrowserWindow.getFocusedWindow()
        if (typeof menuItem.role === 'string') {
          if (focusedWindow === null) {
            this._logger.error(`[Menu Provider] Could not trigger custom click on menuItem ${itemID} with role ${menuItem.role}: No focused Window to trigger on.`)
            return
          }

          // Since menuItems with role have a no-op click function, we must manually
          // implement the functionality here for the custom menus.
          switch (menuItem.role.toLowerCase()) {
            case 'copy':
              focusedWindow.webContents.copy()
              break
            case 'cut':
              focusedWindow.webContents.cut()
              break
            case 'paste':
              focusedWindow.webContents.paste()
              break
            case 'pasteandmatchstyle':
              focusedWindow.webContents.pasteAndMatchStyle()
              break
            case 'redo':
              focusedWindow.webContents.redo()
              break
            case 'selectall':
              focusedWindow.webContents.selectAll()
              break
            case 'undo':
              focusedWindow.webContents.undo()
              break
            case 'zoomin':
              focusedWindow.webContents.zoomLevel++
              break
            case 'zoomout':
              focusedWindow.webContents.zoomLevel--
              break
            case 'resetzoom':
              focusedWindow.webContents.zoomLevel = 0
              break
            case 'togglefullscreen':
              focusedWindow.setFullScreen(!focusedWindow.isFullScreen())
              break
            case 'quit':
              app.quit()
              break
            case 'close':
              focusedWindow.close()
              break
            case 'minimize':
              focusedWindow.minimize()
              break
            default:
              this._logger.error(`[Menu Provider] Could not click menu item with role ${menuItem.role}, since no handler is implemented!`)
          }
        } else {
          console.log(`Clicking menu item with ID ${itemID}`)
          menuItem.click(menuItem, focusedWindow)
        }
      }
    })

    ipcMain.handle('menu-provider', async (event, message) => {
      const { command, payload } = message
      if (command === 'display-native-context-menu') {
        return await this._displayNativeContextMenu(payload.menu, payload.x, payload.y)
      }
    })
  }

  /**
   * Shuts down the provider
   *
   * @return  {boolean} Always returns true
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Menu provider shutting down ...')
  }

  /**
   * Displays a native context menu with the given menu items
   *
   * @param   {MenuItem[]}                 menu  The menu to display
   * @param   {number}                     x     X-coordinate of the menu
   * @param   {number}                     y     Y-coordinate of the menu
   *
   * @return  {Promise<string|undefined>}        Returns the clicked ID, or undefined
   */
  private async _displayNativeContextMenu (menu: MenuItemConstructorOptions[], x: number, y: number): Promise<string|undefined> {
    return await new Promise((resolve, reject) => {
      let resolvedID: string|undefined
      // Define a quick'n'dirty recursive function that applies the click handler
      // to (theoretically) indefinite submenus
      const applyClickHandler = (item: MenuItemConstructorOptions): void => {
        item.click = () => { resolvedID = item.id }

        // Apple's Human Interface Guidelines state that context menus should
        // not feature any keyboard shortcuts, so we should remove any potential
        // accelerator here
        // cf. https://developer.apple.com/design/human-interface-guidelines/macos/menus/contextual-menus/
        if (process.platform === 'darwin' && 'accelerator' in item) {
          item.accelerator = undefined
        }

        // Recurse into a potential submenu
        if (item.submenu !== undefined) {
          for (const subItem of item.submenu as MenuItemConstructorOptions[]) {
            applyClickHandler(subItem)
          }
        }
      }

      // Apply the click handler to the menu itself
      for (const item of menu) {
        applyClickHandler(item)
      }

      const popupMenu = Menu.buildFromTemplate(menu)
      popupMenu.on('menu-will-close', (event) => {
        setTimeout(() => {
          // NOTE/DEBUG: We have to resolve on the next tick, since this event
          // unfortunately is emitted *before* the item click is triggered.
          // See: https://github.com/electron/electron/issues/28719
          resolve(resolvedID)
        }, 100)
      })
      popupMenu.popup({ x: x, y: y })
    })
  }

  /**
   * Turns a MenuItem into a serializable metadata object for sending through IPC
   *
   * @param   {MenuItem}  menuItem  The menu item to serialize
   *
   * @return  {any}            The serialized item
   */
  _makeItemSerializable (menuItem: Electron.MenuItem): AnyMenuItem {
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
    // Create a small helper function that will manage a volatile checkbox state.
    // Volatile means: The menu will attempt to retrieve a checkbox state that
    // is not controlled by a setting (and as such cannot be retrieved with
    // this._config.get). For those checkboxes, the menu provider will maintain
    // a map that persists the checkbox state for as long as the program runs.
    const getState = (id: string, init: boolean): boolean => {
      const result = this._checkboxState.get(id)
      if (result === undefined) {
        this._checkboxState.set(id, init)
        return init
      } else {
        return result
      }
    }

    // Also allow the menu handlers to set the state
    const setState = (id: string, val: boolean): void => {
      this._checkboxState.set(id, val)
    }

    const blueprint = BLUEPRINTS[process.platform](this._logger, this._config, this._recentDocs, this._commands, this._windows, getState, setState)
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
