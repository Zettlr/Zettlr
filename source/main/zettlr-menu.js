/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrMenu class
* CVM-Role:        Controller
* Maintainer:      Hendrik Erz
* License:         GNU GPL v3
*
* Description:     Very basic wrapper around electron Menu class.
*
* END HEADER
*/

const { Menu, ipcMain } = require('electron')
const electron = require('electron')
const app = electron.app
const { trans } = require('../common/lang/i18n.js')

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
class ZettlrMenu {
  /**
  * Creates the main application menu and sets it.
  * @param {ZettlrWindow} parent The main window.
  */
  constructor (parent) {
    this._window = parent
    // This array holds the top-level menu items so that each renderer can
    // easily request them
    this._topLevelMenuItems = []

    // Begin listening to configuration update events that announce a change in
    // the recent docs list so that we can make sure the menu is always updated.
    global.recentDocs.on('update', () => { this.set() })
    global.config.on('update', () => { this.set() })

    ipcMain.on('menu-provider', (event, message) => {
      const { command } = message

      if (command === 'get-top-level-items') {
        event.sender.webContents.send('menu-provider', {
          command: 'get-top-level-items',
          payload: this._topLevelMenuItems
        })
      } else if (command === 'get-submenu') {
        const { payload } = message // Payload contains the menu ID
        const appMenu = Menu.getApplicationMenu()
        if (appMenu === null) {
          global.log.error(`[Menu Provider] Could not provide requested submenu for ID ${payload}: No menu set.`)
          return
        }

        const menuItem = appMenu.getMenuItemById(payload)

        if (menuItem === null) {
          global.log.error(`[Menu Provider] Could not provide submenu: Menu Item ${payload} not found.`)
          return
        }

        event.sender.webContents.send('menu-provider', {
          command: 'get-submenu',
          // We need to ensure to have a serializable submenu
          // (containing only labels and IDs)
          payload: this._makeItemSerializable(menuItem).submenu,
          menuItemId: payload // Attach the original menu item ID for easier access in the renderer
        })
      } else if (command === 'click-menu-item') {
        const { payload } = message

        const appMenu = Menu.getApplicationMenu()
        if (appMenu === null) {
          global.log.error(`[Menu Provider] Could not trigger a click on item ${payload}: No menu set.`)
          return
        }

        const menuItem = appMenu.getMenuItemById(payload)

        if (menuItem === null) {
          global.log.error(`[Menu Provider] Could not rigger a click on item ${menuItem}: No item found.`)
          return
        }

        // And now trigger a click!
        menuItem.click()
      }
    })
  }

  /**
   * Turns a MenuItem into a serializable metadata object for sending through IPC
   *
   * @param   {MenuItem}  menuItem  The menu item to serialize
   *
   * @return  {any}            The serialized item
   */
  _makeItemSerializable (menuItem) {
    let serializableItem = {
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
   * @param  {Object} menutpl The template to process
   * @return {Object}         The ready menu
   */
  _buildFromSource (menutpl) {
    let menu = {
      label: '',
      submenu: []
    }

    if (menutpl.hasOwnProperty('label') && menutpl.label !== 'Zettlr') menu.label = trans(menutpl.label)
    if (menutpl.hasOwnProperty('label') && menutpl.label === 'Zettlr') menu.label = 'Zettlr'

    // Top level menus can also have a role (window or help)
    if (menutpl.hasOwnProperty('role')) menu.role = menutpl.role
    // And also an ID.
    if (menutpl.hasOwnProperty('id')) {
      menu.id = menutpl.id
    } else {
      // In case there's no special ID, take the label translation string, which
      // is in any case safe for transportation in any way (= ASCII only)
      menu.id = menutpl.label
    }

    // Traverse the submenu and apply
    for (let item of menutpl.submenu) {
      let builtItem = {}
      // Enable submenu recursion
      if (item.hasOwnProperty('submenu')) builtItem = this._buildFromSource(item)

      // Simple copying of trivial attributes
      if (item.hasOwnProperty('label')) builtItem.label = trans(item.label)
      if (item.hasOwnProperty('type')) builtItem.type = item.type
      if (item.hasOwnProperty('role')) builtItem.role = item.role
      // Needed to address the items later on
      if (item.hasOwnProperty('id')) {
        builtItem.id = item.id
      } else {
        // In case there's no special ID, take the label translation string, which
        // is in any case safe for transportation in any way (= ASCII only)
        builtItem.id = item.label
      }

      // Higher-order attributes

      // Accelerators may be system specific for macOS
      if (item.hasOwnProperty('accelerator')) {
        builtItem.accelerator = item.accelerator
      }

      // Weblinks are "target"s
      if (item.hasOwnProperty('target')) {
        builtItem.click = function (menuitem, focusedWindow) {
          require('electron').shell.openExternal(item.target)
        }
      }

      // Commands need to be simply sent to the renderer
      if (item.hasOwnProperty('command')) {
        builtItem.click = function (menuitem, focusedWindow) {
          global.ipc.send(item.command)
        }
      }

      // Checkboxes can be checked based on a config value
      if (item.hasOwnProperty('checked') && item.checked !== 'null') {
        builtItem.checked = global.config.get(item.checked)
      } else if (item.hasOwnProperty('checked') && item.checked === 'null') {
        // If it's null, simply preset with false
        builtItem.checked = false
      }

      // Methods are specialised commands that need to be hardcoded here.
      if (item.hasOwnProperty('zettlrRole')) {
        switch (item.zettlrRole) {
          case 'reloadWindow':
            builtItem.click = function (menuitem, focusedWindow) {
              if (focusedWindow) focusedWindow.reload()
            }
            break
          case 'toggleDevTools':
            builtItem.click = function (menuitem, focusedWindow) {
              if (focusedWindow) focusedWindow.webContents.toggleDevTools()
            }
            break
          case 'openLogViewer':
            builtItem.click = function (menuitem, focusedWindow) {
              global.log.showLogViewer()
            }
            break
          case 'openDictData':
            builtItem.click = function (menuitem, focusedWindow) {
              require('electron').shell.openPath(require('path').join(require('electron').app.getPath('userData'), '/dict'))
                .then(potentialError => {
                  if (potentialError !== '') {
                    global.log.error('Could not open dictionary directory:' + potentialError)
                  }
                })
                .catch(err => global.log.error(`[Menu Provider] Could not open the dictionary directory: ${err.message}`, err))
            }
            break
          // Enumerate the recent docs
          case 'recent-docs':
            builtItem.submenu = [{
              id: 'menu.clear_recent_docs',
              label: trans('menu.clear_recent_docs'),
              click: (item, win) => { global.recentDocs.clear() }
            }, { type: 'separator' }]
            // Disable if there are no recent docs
            if (!global.recentDocs.hasDocs()) builtItem.submenu[0].enabled = false
            // Get the most recent 10 documents
            for (let recent of global.recentDocs.get().slice(0, 10)) {
              builtItem.submenu.push({
                id: recent.name,
                label: recent.name,
                click: function (menuitem, focusedWindow) {
                  if (global.mainWindow) {
                    global.mainWindow.webContents.send('message', { 'command': 'file-get', 'content': recent.hash })
                  } else if (focusedWindow) {
                    focusedWindow.webContents.send('message', { 'command': 'file-get', 'content': recent.hash })
                  }
                }
              })
            }
            break
        }
      }
      // Finally append the menu item
      menu.submenu.push(builtItem)
    }

    return menu
  }

  /**
   * Generates the application menu from the blueprint.
   */
  _build () {
    let mainMenu = []
    const blueprint = BLUEPRINTS[process.platform]

    // First, retrieve the top level menu items and translate them
    this._topLevelMenuItems = Object.keys(blueprint).map((key) => {
      let label = blueprint[key].label
      label = (label.indexOf('.') < 0) ? label : trans(label)
      return {
        label: label,
        id: blueprint[key].id
      }
    })

    // Now concat
    if (process.platform === 'darwin') mainMenu.push(this._buildFromSource(blueprint.app))
    mainMenu.push(this._buildFromSource(blueprint.file))
    mainMenu.push(this._buildFromSource(blueprint.edit))
    mainMenu.push(this._buildFromSource(blueprint.view))
    if (global.config.get('debug')) mainMenu.push(this._buildFromSource(blueprint.debug))
    mainMenu.push(this._buildFromSource(blueprint.window))
    mainMenu.push(this._buildFromSource(blueprint.help))

    // Last but not least add the Quit item (either app menu or file, always the first submenu)
    mainMenu[0].submenu.push({ type: 'separator' },
      {
        label: trans('menu.quit'),
        id: 'menu-quit',
        accelerator: 'CmdOrCtrl+Q',
        click (item, focusedWindow) {
          if (global.mainWindow) {
            global.mainWindow.send('message', { 'command': 'app-quit' })
          } else if (focusedWindow) {
            focusedWindow.webContents.send('message', { 'command': 'app-quit' })
          } else {
            // If this part is executed it means there's no window, so simply quit.
            app.quit()
          }
        }
      })

    // Last but not least build the template
    return Menu.buildFromTemplate(mainMenu)
  }

  /**
   * Generates and sets the main application menu
   */
  set () {
    const builtMenu = this._build()
    Menu.setApplicationMenu(builtMenu)
  }
}

module.exports = ZettlrMenu
