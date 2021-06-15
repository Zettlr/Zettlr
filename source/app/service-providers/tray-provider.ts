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
  private readonly _menu: MenuItemConstructorOptions[]

  /**
   * Create the instance on program start and setup services.
   */
  constructor () {
    super()
    global.log.verbose('Tray provider booting up ...')
    this._tray = null
    this._menu = [
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
    if (this._tray == null && leaveAppRunning) {
      const platformIcons: { [key: string]: string } = {
        'darwin': '/png/22x22_white.png',
        'win32': '/icon.ico'
      }
      if (process.platform === 'linux') {
        const size = this._calcTrayIconSize()
        this._tray = new Tray(path.join(__dirname, `assets/icons/png/${size}x${size}.png`))
      } else {
        let iconPath = '/png/32x32.png'
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          iconPath = platformIcons[process.platform]
        }
        this._tray = new Tray(path.join(__dirname, 'assets/icons', iconPath))
      }

      const contextMenu = Menu.buildFromTemplate(this._menu)
      this._tray.setToolTip(trans('tray.tooltip'))
      this._tray.setContextMenu(contextMenu)
    }
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
