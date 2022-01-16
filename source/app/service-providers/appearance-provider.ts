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

import { ipcMain, nativeTheme, systemPreferences } from 'electron'

let mode: 'off'|'system'|'schedule'|'auto' = 'off'
let scheduleWasDark: boolean = false
let startHour: number = 0
let startMin: number = 0
let endHour: number = 0
let endMin: number = 0

export async function boot (): Promise<void> {
  global.log.verbose('Appearance provider booting up ...')
  mode = global.config.get('autoDarkMode')
  // Initially, get the start and end times
  recalculateSchedule()

  // Initially set the dark mode after startup, if the mode is set to "system"
  if (mode === 'system') {
    global.config.set('darkMode', nativeTheme.shouldUseDarkColors)
  } else if (process.platform === 'darwin') {
    // Override the app level appearance immediately
    systemPreferences.appLevelAppearance = (global.config.get('darkMode') === true) ? 'dark' : 'light'
  }

  // It may be that it was already dark when the user started the app, but the
  // theme was light. This makes sure the theme gets set once after application
  // start --- But if the user decides to change it back, it'll not be altered.
  if (mode === 'schedule' && global.config.get('darkMode') !== isItDark()) {
    global.config.set('darkMode', isItDark())
    scheduleWasDark = isItDark()
  }

  /**
   * Subscribe to the updated-event in order to determine when the underlying
   * state has changed.
   */
  nativeTheme.on('updated', () => {
    // Only react to these notifications if the schedule is set to 'system'
    if (mode === 'system') {
      global.log.info('Switching to ' + (nativeTheme.shouldUseDarkColors ? 'dark' : 'light') + ' mode')

      // Set the var accordingly
      global.config.set('darkMode', nativeTheme.shouldUseDarkColors)
    }
  })

  // Subscribe to configuration updates
  global.config.on('update', (option: string) => {
    // Set internal vars accordingly
    if (option === 'autoDarkMode') {
      mode = global.config.get('autoDarkMode')
    } else if ([ 'autoDarkModeEnd', 'autoDarkModeStart' ].includes(option)) {
      recalculateSchedule()
    } else if (option === 'darkMode' && process.platform === 'darwin') {
      const shouldBeDark = nativeTheme.shouldUseDarkColors
      const isDark = Boolean(global.config.get('darkMode'))
      if (shouldBeDark !== isDark) {
        // Explicitly set the appLevelAppearance in case the internal theme
        // differs from the operating system.
        systemPreferences.appLevelAppearance = (isDark) ? 'dark' : 'light'
      } else {
        // DEBUG: See issue https://github.com/electron/electron/issues/30413
        // @ts-expect-error
        systemPreferences.appLevelAppearance = null
      }
    }
  })

  ipcMain.handle('appearance-provider', (event, { command, payload }) => {
    // This command returns the accent colour including a contrast colour to be used
    // as the opposite colour, if a good visible contrast is wished for.
    if (command === 'get-accent-color') {
      // Fully opaque Zettlr green with white as contrast
      const colorFallback = { accent: '1cb27eff', contrast: 'ffffffff' }
      // A renderer has requested the current accent colour. The accent colour
      // MUST be returned, and can be retrieved automatically for macOS and
      // Windows, and will be the Zettlr green on Linux systems. Format is
      // always RGBA hexadecimal without preceeding #-sign.
      if (![ 'darwin', 'win32' ].includes(process.platform)) {
        return colorFallback
      }
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
          return { accent: accentColor, contrast: (ratio > threshold) ? dark : light }
        }
      } catch (err) {
        return colorFallback // Probably macOS < 10.14
      }
    }
  })

  setInterval(tick, 1000) // Every second check if we should switch modes
}

/**
 * Shuts down the provider
 *
 * @return {boolean} Always returns true
 */
export async function shutdown (): Promise<boolean> {
  global.log.verbose('Appearance provider shutting down ...')
  return true
}

/**
 * Retrieves the schedule of when to go into dark/light mode
 */
function recalculateSchedule (): void {
  const start = global.config.get('autoDarkModeStart').split(':')
  const end = global.config.get('autoDarkModeEnd').split(':')

  startHour = parseInt(start[0], 10)
  startMin = parseInt(start[1], 10)
  endHour = parseInt(end[0], 10)
  endMin = parseInt(end[1], 10)

  // Make sure the times differ.
  if (startHour === endHour && startMin === endMin) {
    endMin++
  }
}

/**
 * Returns true if, according to the schedule, Zettlr should now be in dark mode
 *
 * @return {boolean} Whether or not time indicates it should be dark now.
 */
function isItDark (): boolean {
  const now = new Date()
  const nowMin = now.getMinutes()
  const nowHours = now.getHours()

  // Overnight is when the startHour is bigger than the endHour
  // (or the startMinutes bigger than the endMinutes, even only by one)
  const isOvernight = startHour > endHour || (startHour === endHour && startMin > endMin)
  const nowLaterThanStart = nowHours > startHour || (nowHours === startHour && nowMin >= startMin)
  const nowEarlierThanEnd = nowHours < endHour || (nowHours === endHour && nowMin < endMin)

  if (isOvernight) {
    // In this case, now needs to be bigger than start or less than end
    return nowLaterThanStart || nowEarlierThanEnd
  } else {
    // Here, the current time needs to be between start and end
    return nowLaterThanStart && nowEarlierThanEnd
  }
}

function tick (): void {
  if (mode !== 'schedule' || scheduleWasDark === isItDark()) {
    return
  }
  // By tracking the status of the time, we avoid annoying people by forcing
  // the dark or light theme even if they decide to change it later on. This
  // time Zettlr will only trigger a theme change if we traversed from
  // daytime to nighttime, and leave out the question of whether or not dark
  // mode has been active or not.

  global.log.info('Switching appearance to ' + ((isItDark()) ? 'dark' : 'light'))
  global.config.set('darkMode', isItDark())
  scheduleWasDark = isItDark()
}
