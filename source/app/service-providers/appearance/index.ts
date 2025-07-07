/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AppearanceProvider class
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables Zettlr to adapt its display mode according to user
 *                  settings.
 *
 * END HEADER
 */

import type ConfigProvider from '@providers/config'
import {
  ipcMain,
  nativeTheme,
  systemPreferences
} from 'electron'
import type LogProvider from '../log'
import ProviderContract from '../provider-contract'

/**
 * This class manages automatic changes in the appearance of the app. It won't
 * do anything, if the scheduler is set to off, listen to changes in the
 * operating system's appearance if set to system, and switch the mode on a given
 * time if set to schedule.
 */
export default class AppearanceProvider extends ProviderContract {
  private _mode: 'off'|'system'|'schedule'
  private scheduleWasDark: boolean
  private _startHour: number
  private _startMin: number
  private _endHour: number
  private _endMin: number
  private _tickInterval: NodeJS.Timeout

  /**
   * Create the instance on program start and initially load the settings.
   */
  constructor (private readonly _logger: LogProvider, private readonly _config: ConfigProvider) {
    super()
    // Possible modes:
    // - off: Do nothing in here
    // - schedule: Ask the clock when to switch
    // - system: Listen to mode changes based on the operating system (macOS and Windows, some Linux distributions)

    // Initiate everything
    this._mode = 'off'
    this.scheduleWasDark = false

    // The TypeScript linter is not clever enough to see that the function will
    // definitely set the initial values ...
    this._startHour = 0
    this._startMin = 0
    this._endHour = 0
    this._endMin = 0

    /**
     * Subscribe to the updated-event in order to determine when the underlying
     * state has changed.
     */
    nativeTheme.on('updated', () => {
      // Only react to these notifications if the schedule is set to 'system'
      if (this._mode !== 'system') {
        return
      }

      const isDark = nativeTheme.shouldUseDarkColors
      this._logger.info(`Switching to ${isDark ? 'dark' : 'light'} mode.`)
      this._config.set('darkMode', isDark)
    })

    // Subscribe to configuration updates
    this._config.on('update', (option: string) => {
      const { autoDarkMode, darkMode } = this._config.get()
      if (option === 'autoDarkMode') {
        this._mode = autoDarkMode
      } else if ([ 'autoDarkModeEnd', 'autoDarkModeStart' ].includes(option)) {
        this.recalculateSchedule()
      } else if (option === 'darkMode' && process.platform === 'darwin') {
        const shouldBeDark = nativeTheme.shouldUseDarkColors
        if (shouldBeDark !== darkMode) {
          // Explicitly set the appLevelAppearance in case the internal theme
          // differs from the operating system.
          nativeTheme.themeSource = darkMode ? 'dark' : 'light'
        } else {
          nativeTheme.themeSource = 'system'
        }
      }
    })

    ipcMain.handle('appearance-provider', (event, { command }) => {
      // This command returns the accent colour including a contrast colour to be used
      // as the opposite colour, if a good visible contrast is wished for.
      if (command === 'get-accent-color') {
        const colorFallback = {
          accent: '1cb27eff', // Fully opaque Zettlr green
          contrast: 'ffffffff' // White as a contrast
        }
        // A renderer has requested the current accent colour. The accent colour
        // MUST be returned, and can be retrieved automatically for macOS and
        // Windows, and will be the Zettlr green on Linux systems. Format is
        // always RGBA hexadecimal without preceeding #-sign.
        if ([ 'darwin', 'win32' ].includes(process.platform)) {
          try {
            // This method may fail because it is only available on macOS >=10.14
            const accentColor = systemPreferences.getAccentColor()
            // Electron is unspecific about what "available" means so we listen
            // for errors and check the return value
            if (typeof accentColor !== 'string') {
              return colorFallback
            } else {
              // Calculate the contrast before returning
              const dark = '333333ff'
              const light = 'ffffffff'
              const r = parseInt(accentColor.substring(0, 2), 16) // hexToR
              const g = parseInt(accentColor.substring(2, 4), 16) // hexToG
              const b = parseInt(accentColor.substring(4, 6), 16) // hexToB
              const ratio = (r * 0.299) + (g * 0.587) + (b * 0.114)
              const threshold = 186 // NOTE: We can adapt this later on
              return {
                accent: accentColor,
                contrast: (ratio > threshold) ? dark : light
              }
            }
          } catch (err) {
            return colorFallback // Probably macOS < 10.14
          }
        } else {
          return colorFallback // Unsupported platform
        }
      }
    })
  }

  public async boot (): Promise<void> {
    this._logger.verbose('Appearance provider booting up ...')

    const { autoDarkMode, darkMode } = this._config.get()

    this.recalculateSchedule() // Parse the start and end times
    this._mode = autoDarkMode
    this.scheduleWasDark = this.scheduleIsDark() // Preset where we currently are

    // Initially set the dark mode after startup, if the mode is set to "system"
    if (this._mode === 'system') {
      this._config.set('darkMode', nativeTheme.shouldUseDarkColors)
    } else {
      // Override the app level appearance immediately
      nativeTheme.themeSource = darkMode ? 'dark' : 'light'
    }

    // It may be that it was already dark when the user started the app, but the
    // theme was light. This makes sure the theme gets set once after application
    // start --- But if the user decides to change it back, it'll not be altered.
    if (this._mode === 'schedule' && darkMode !== this.scheduleIsDark()) {
      this._config.set('darkMode', this.scheduleIsDark())
    }

    this._tickInterval = setInterval(() => { this.tick() }, 1000)
  }

  tick (): void {
    if (this._mode !== 'schedule') {
      return
    }

    // By tracking the status of the time, we avoid annoying people by forcing
    // the dark or light theme even if they decide to change it later on. This
    // time Zettlr will only trigger a theme change if we traversed from
    // daytime to nighttime, and leave out the question of whether or not dark
    // mode has been active or not.
    if (this.scheduleWasDark !== this.scheduleIsDark()) {
      // The schedule just changed -> change the theme
      this.scheduleWasDark = this.scheduleIsDark()
      this._logger.info(`Switching appearance to ${this.scheduleWasDark ? 'dark' : 'light'}`)
      this._config.set('darkMode', this.scheduleWasDark)
    }
  }

  /**
   * Parses the current auto dark mode start and end times for quick access.
   */
  private recalculateSchedule (): void {
    const { autoDarkModeStart, autoDarkModeEnd } = this._config.get()
    const start = autoDarkModeStart.split(':')
    const end = autoDarkModeEnd.split(':')

    this._startHour = parseInt(start[0], 10)
    this._startMin = parseInt(start[1], 10)
    this._endHour = parseInt(end[0], 10)
    this._endMin = parseInt(end[1], 10)

    // Make sure the times differ.
    if (
      this._startHour === this._endHour &&
      this._startMin === this._endMin
    ) {
      this._endMin++
    }
  }

  /**
   * Returns true if, according to the schedule, Zettlr should now be in dark
   * mode.
   *
   * @return {boolean} Whether or not time indicates it should be dark now.
   */
  private scheduleIsDark (): boolean {
    const now = new Date()
    const nowMin = now.getMinutes()
    const nowHours = now.getHours()

    // Overnight is when the startHour is bigger than the endHour
    // (or the startMinutes bigger than the endMinutes, even only by one)
    const isOvernight = this._startHour > this._endHour || (this._startHour === this._endHour && this._startMin > this._endMin)
    const nowLaterThanStart = nowHours > this._startHour || (nowHours === this._startHour && nowMin >= this._startMin)
    const nowEarlierThanEnd = nowHours < this._endHour || (nowHours === this._endHour && nowMin < this._endMin)

    if (isOvernight) {
      // In this case, now needs to be bigger than start or less than end
      return nowLaterThanStart || nowEarlierThanEnd
    } else {
      // Here, the current time needs to be between start and end
      return nowLaterThanStart && nowEarlierThanEnd
    }
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Appearance provider shutting down ...')
    clearInterval(this._tickInterval)
  }
}
