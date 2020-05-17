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

const { Menu } = require('electron')
const electron = require('electron')
const app = electron.app
const { trans } = require('../common/lang/i18n.js')

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
    // Load the blueprint
    this._blueprint = require('./assets/menu.tpl.json')
    this._prebuilt = null

    // Begin listening to configuration update events that announce a change in
    // the recent docs list so that we can make sure the menu is always updated.
    global.recentDocs.on('update', () => { this.set() })
    global.config.on('update', () => { this.set() })
  }

  /**
   * Generates a menu from the blueprint template source.
   * @param  {Object} menutpl The template to process
   * @return {Object}         The ready menu
   */
  _buildFromSource (menutpl) {
    if (!menutpl) {
      throw new Error('No menutpl detected!')
    }
    let menu = {
      'label': '',
      'submenu': []
    }
    if (menutpl.hasOwnProperty('label') && menutpl.label !== 'Zettlr') menu.label = trans(menutpl.label)
    if (menutpl.hasOwnProperty('label') && menutpl.label === 'Zettlr') menu.label = 'Zettlr'

    // Top level menus can also have a role (window or help)
    if (menutpl.hasOwnProperty('role')) menu.role = menutpl.role

    // Traverse the submenu and apply
    for (let item of menutpl.submenu) {
      // Mixins are used in pretty much the same way as they are in LESS:
      // They append additional menu items that can be reused.
      if (item.hasOwnProperty('mixin')) {
        switch (item.mixin) {
          case 'darwin_prefs':
            // "replace" this menu item with some others
            if (process.platform === 'darwin') menu.submenu = menu.submenu.concat(this._buildFromSource(this._blueprint.mixin_preferences).submenu)
            break
          case 'other_prefs':
            if (process.platform !== 'darwin') menu.submenu = menu.submenu.concat(this._buildFromSource(this._blueprint.mixin_preferences).submenu)
            break
          case 'darwin_speech':
            if (process.platform === 'darwin') menu.submenu = menu.submenu.concat(this._buildFromSource(this._blueprint.mixin_speech).submenu)
            break
        }
        continue // No need to process further; mixins only have the mixin attribute
      }
      let builtItem = {}
      // Enable submenu recursion
      if (item.hasOwnProperty('submenu')) builtItem = this._buildFromSource(item)

      // Simple copying of trivial attributes
      if (item.hasOwnProperty('label')) builtItem.label = trans(item.label)
      if (item.hasOwnProperty('type')) builtItem.type = item.type
      if (item.hasOwnProperty('role')) builtItem.role = item.role

      // Higher-order attributes

      // Accelerators may be system specific for macOS
      if (item.hasOwnProperty('accelerator')) {
        if (typeof item.accelerator !== 'string') {
          builtItem.accelerator = (process.platform === 'darwin') ? item.accelerator.darwin : item.accelerator.other
        } else {
          builtItem.accelerator = item.accelerator
        }
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
          if (global.mainWindow) {
            global.mainWindow.webContents.send('message', { 'command': item.command })
          } else if (focusedWindow) {
            focusedWindow.webContents.send('message', { 'command': item.command })
          }
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
      if (item.hasOwnProperty('id')) {
        builtItem.id = item.id // Save it to the menu for potential recovery
        switch (item.id) {
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
              require('electron').shell.openItem(require('path').join(require('electron').app.getPath('userData'), '/dict'))
            }
            break
          // Enumerate the recent docs
          case 'recent-docs':
            builtItem.submenu = [{
              'label': trans('menu.clear_recent_docs'),
              'click': (item, win) => { global.recentDocs.clear() }
            }, { 'type': 'separator' }]
            // Disable if there are no recent docs
            if (!global.recentDocs.hasDocs()) builtItem.submenu[0].enabled = false
            // Get the most recent 10 documents
            var i = 0
            for (let recent of global.recentDocs.get().slice(0, 10)) {
              i++
              builtItem.submenu.push({
                'label': recent.name,
                'accelerator': (i === 10) ? 'CmdOrCtrl+0' : `CmdOrCtrl+${i}`,
                'click': function (menuitem, focusedWindow) {
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

    // Now concat
    if (process.platform === 'darwin') mainMenu.push(this._buildFromSource(this._blueprint.app))
    mainMenu.push(this._buildFromSource(this._blueprint.file))
    mainMenu.push(this._buildFromSource(this._blueprint.edit))
    mainMenu.push(this._buildFromSource(this._blueprint.view))
    if (process.platform === 'darwin') mainMenu.push(this._buildFromSource(this._blueprint.window))
    if (global.config.get('debug')) mainMenu.push(this._buildFromSource(this._blueprint.debug))
    mainMenu.push(this._buildFromSource(this._blueprint.help))

    // Last but not least add the Quit item (either app menu or file, always the first submenu)
    mainMenu[0].submenu.push({ type: 'separator' },
      {
        label: trans('menu.quit'),
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
    this._prebuilt = Menu.buildFromTemplate(mainMenu)
  }

  /**
   * Generates and sets the main application menu
   */
  set () {
    if (!this._prebuilt) this._build()
    Menu.setApplicationMenu(this._prebuilt)
    this._prebuilt = null
  }

  /**
   * Instead of setting the application menu, this "pops up" the menu at the
   * specified coordinates.
   * @param  {integer} x The x position of the menu
   * @param  {integer} y The y position of the menu
   * @return {void}   Does not return.
   */
  popup (x = 15, y = 15) {
    if (!this._prebuilt) this._build()
    this._prebuilt.popup({ 'x': x, 'y': y })
    this._prebuilt = null
  }
}

module.exports = ZettlrMenu
