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
  type MenuItemConstructorOptions,
  screen,
  app
} from 'electron'
import path from 'path'
import { trans } from '@common/i18n-main'
import ProviderContract from '../provider-contract'
import type WindowProvider from '../windows'
import type LogProvider from '../log'
import type ConfigProvider from '@providers/config'
import { getCLIArgument, LAUNCH_MINIMIZED } from '@providers/cli-provider'

/**
 * This class generates the Tray in the system notification area
 */
export default class TrayProvider extends ProviderContract {
  /**
   * The tray
   */
  private _tray: Tray | null

  /**
   * Create the instance on program start and setup services.
   */
  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _windows: WindowProvider
  ) {
    super()
    this._tray = null

    if (process.env.ZETTLR_IS_TRAY_SUPPORTED === '0') {
      this._config.set('system.leaveAppRunning', false)
    }

    this._config.on('update', (option: string) => {
      if (option === 'system.leaveAppRunning') {
        // even if the tray should not be shown, since we start in Tray we need to show it anyway
        if (this._config.get('system.leaveAppRunning') === true) {
          this.add()
        } else {
          this._removeTray()
        }
      }
    })
  }

  async boot (): Promise<void> {
    this._logger.verbose('Tray provider booting up ...')
    let addToTray: boolean = this._config.get('system.leaveAppRunning')
    const shouldStartMinimized = getCLIArgument(LAUNCH_MINIMIZED) === true
    const traySupported = process.env.ZETTLR_IS_TRAY_SUPPORTED === '1'

    if (shouldStartMinimized && !addToTray && traySupported) {
      this._logger.info('[Tray Provider] Detected the --launch-minimized flag. Will override the tray setting.')
      // The user has indicated via CLI flag that they want to start the app
      // minimized, so we require the corresponding setting to be set
      this._config.set('system.leaveAppRunning', true)
      addToTray = true
    }

    if (addToTray) {
      this.add()
    }
  }

  /**
   * Shuts down the provider
   *
   * @return  {boolean} Always returns true
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Tray provider shutting down ...')
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
  public add (): void {
    const leaveAppRunning: boolean = this._config.get('system.leaveAppRunning')

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
      iconPath = path.join(__dirname, 'assets/icons/macOS-menubar/tray-Template.png')
    } else if (process.platform === 'win32') {
      // On Windows, we're using the ICO-file.
      iconPath = path.join(__dirname, 'assets/icons/icon.ico')
    }

    // Provide the app's UUID so that, on Windows and macOS, the tray icon will
    // remain at its correct position.
    this._tray = new Tray(iconPath, this._config.get().uuid)

    this._tray.on('click', () => {
      this._windows.activateFromTray()
    })

    const menu: MenuItemConstructorOptions[] = [
      {
        label: trans('Show Zettlr'),
        click: () => this._windows.activateFromTray(),
        type: 'normal'
      },
      { label: '', type: 'separator' },
      {
        label: trans('Quit'),
        click: () => app.quit(),
        type: 'normal'
      }
    ]

    const contextMenu = Menu.buildFromTemplate(menu)
    this._tray.setToolTip(trans('Zettlr'))
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
