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
  app,
  nativeTheme
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
    this._tray = null

    global.tray = {
      /**
       * Adds the Zettlr tray to the system notification area.
       */
      add: () => {
        this._addTray()
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

    nativeTheme.on('updated', () => {
      if (process.platform !== 'darwin') {
        return // Only important on macOS
      }

      // On macOS we have two different icons, one for light mode and one for
      // dark Mode. So whenever the mode changes, re-create the Tray to reflect
      // this fact. NOTE: Here we do NOT listen to configuration changes, since
      // the Tray icon is not bound to the GUI. Rather, the icon must use the
      // correct color according to the SYSTEM, and NOT the GUI!
      if (global.config.get('system.leaveAppRunning') === true) {
        this._addTray()
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
      // On macOS, we're using the appropriate colour
      const mode = (nativeTheme.shouldUseDarkColors) ? 'white' : 'black'
      iconPath = path.join(__dirname, `assets/icons/png/22x22_${mode}.png`)
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
