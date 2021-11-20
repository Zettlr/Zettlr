/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TrayProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Tray provider of electron's Tray class.
 *
 * END HEADER
 */

import {
  Tray,
  Menu,
  MenuItemConstructorOptions,
  screen,
  app
} from 'electron'
import path from 'path'
import EventEmitter from 'events'
import { trans } from '../../common/i18n-main'

/**
 * This class generates the Tray in the system notification area
 */
export default class TrayProvider extends EventEmitter {
  /**
   * The tray
   */
  private _tray: Tray | null

  /**
   * Create the instance on program start and setup services.
   */
  constructor () {
    super()
    global.log.verbose('Tray provider booting up ...')
    if (this._tray != null) {
      this._removeTray()
    }
    this._tray = null

    global.tray = {
      /**
       * Adds the Zettlr tray to the system notification area.
       */
      add: () => {
        // see  _removeTray ()
        // this does not recreate the tray if there is already one to prevent duplicates
        if (process.platform === 'linux') {
          if (this._tray == null) {
            this._addTray()
          }
        } else {
          this._addTray()
        }
      }
    }

    if (process.env.ZETTLR_IS_TRAY_SUPPORTED === '0') {
      global.config.set('system.leaveAppRunning', false)
    }

    global.config.on('update', (option: string) => {
      if (option === 'system.leaveAppRunning') {
        if (global.config.get('system.leaveAppRunning') === true) {
          this._addTray()
        } else {
          this._removeTray()
        }
      }
    })
  }

  /**
   * Shuts down the provider
   *
   * @return  {boolean} Always returns true
   */
  shutdown (): boolean {
    global.log.verbose('Tray provider shutting down ...')
    return true // This provider needs no special shutdown logic
  }

  /**
   * Return a suitable tray icon size
   * @private
   * @memberof TrayProvider
   */
  private _calcTrayIconSize (): number {
    let size = 32
    const fitSize = (size: number): number => {
      const sizeList = [ 32, 48, 64, 96, 128, 256 ]
      for (let s of sizeList) {
        if (s >= size) {
          return s
        }
      }
      return 32
    }
    const display = screen.getPrimaryDisplay()
    size = display.workArea.y
    if (size >= 8 && size <= 256) {
      size = fitSize(size)
    } else {
      size = display.size.height - display.workArea.height
      size = fitSize(size)
    }
    return size
  }

  /**
   * Adds the Zettlr tray to the system notification area.
   * @private
   * @memberof TrayProvider
   */
  private _addTray (): void {
    const leaveAppRunning = Boolean(global.config.get('system.leaveAppRunning'))

    if (!leaveAppRunning) {
      return // No need to add a tray.
    }

    if (this._tray !== null) {
      // Destroy the tray before recreating it.
      this._removeTray()
    }

    // Default: 32x32 coloured PNG icon
    let iconPath = path.join(__dirname, 'assets/icons/png/32x32.png')

    if (process.platform === 'linux') {
      // On Linux, we're using the appropriate size
      const size = this._calcTrayIconSize()
      iconPath = path.join(__dirname, `assets/icons/png/${size}x${size}.png`)
    } else if (process.platform === 'darwin') {
      // NOTE: We are using an image that ends in "Template.png". This indicates
      // to the Electron runtime that the image should be treated as a "template"
      // and this means it will automatically be displayed white or black
      // depending on the color of the menu bar.
      iconPath = path.join(__dirname, 'assets/icons/png/22x22_Tray_Template.png')
    } else if (process.platform === 'win32') {
      // On Windows, we're using the ICO-file.
      iconPath = path.join(__dirname, 'assets/icons/icon.ico')
    }

    this._tray = new Tray(iconPath)

    const menu: MenuItemConstructorOptions[] = [
      {
        label: trans('tray.show_zettlr'),
        click: () => global.application.showAnyWindow(),
        type: 'normal'
      },
      { label: '', type: 'separator' },
      {
        label: trans('menu.quit'),
        click: () => app.quit(),
        type: 'normal'
      }
    ]

    const contextMenu = Menu.buildFromTemplate(menu)
    this._tray.setToolTip(trans('tray.tooltip'))
    this._tray.setContextMenu(contextMenu)
  }

  /**
   * Removes the Zettlr tray from the system notification area.
   * @private
   * @memberof TrayProvider
   */
  private _removeTray (): void {
    // Linux with Gnome Desktop cannot destroy the tray due to bug
    // https://github.com/electron/electron/issues/17622
    if (process.platform === 'linux' && process.env.XDG_CURRENT_DESKTOP === 'GNOME') {
      return
    }
    if (this._tray != null) {
      this._tray.destroy()
    }
    this._tray = null
  }
}
