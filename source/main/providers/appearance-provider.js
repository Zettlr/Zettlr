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

const EventEmitter = require('events')
const { systemPreferences } = require('electron')

/**
 * This class manages automatic changes in the appearance of the app. It won't
 * do anything, if the scheduler is set to off, listen to changes in the
 * operating system's appearance if set to system, and switch the mode on a given
 * time if set to schedule.
 */
class AppearanceProvider extends EventEmitter {
  /**
   * Create the instance on program start and initially load the settings.
   */
  constructor () {
    super()

    // Possible modes:
    // - off: Do nothing in here
    // - schedule: Ask the clock when to switch
    // - system: Only on macOS (probably Windows as well): Listen to mode changes
    // - auto: Basically schedule, only calculated based on timezone (to be implemented)

    // Initiate everything
    this._mode = global.config.get('autoDarkMode')
    this._scheduleWasDark = this._isItDark() // Preset where we currently are
    this._isDarkMode = global.config.get('darkTheme')
    this._recalculateSchedule() // Parse the start and end times

    /**
     * On macOS, subscribe to AppleInterfaceThemeChangedNotifications to be notified
     * whenever the system's theme changes. The actual theme change is only applied,
     * if the config setting is set to "system", i.e.: follow system appearance.
     */
    if (process.platform === 'darwin') {
      systemPreferences.subscribeNotification('AppleInterfaceThemeChangedNotification', (event, userInfo) => {
        // Only react to these notifications if the schedule is set to 'system'
        if (this._mode !== 'system') return
        // Set the var accordingly
        global.config.set('darkTheme', systemPreferences.isDarkMode())
      })
    } else if (process.platform === 'win32') {
      // On Windows, we achieve the same effect by listening for inverted colour
      // scheme changes.
      systemPreferences.on('inverted-color-scheme-changed', (event, invertedColorScheme) => {
        if (this._mode !== 'system') return
        // Also set the var accordingly
        global.config.set('darkTheme', invertedColorScheme)
      })
    }

    // Subscribe to configuration updates
    global.config.on('update', (option) => {
      // Set internal vars accordingly
      if (option === 'autoDarkMode') this._mode = global.config.get('autoDarkMode')
      if (option === 'darkTheme') this._isDarkMode = global.config.get('darkTheme')
      if (option === 'autoDarkModeStart') this._recalculateSchedule()
      if (option === 'autoDarkModeEnd') this._recalculateSchedule()
    })

    // new Date().getTimezoneOffset() <-- This returns the LOCAL timezone offset in minutes, so divide by 60 then you have the hours
    this.tick() // Begin the tick
  }

  tick () {
    if (this._mode === 'schedule') {
      // By tracking the status of the time, we avoid annoying people by forcing
      // the dark or light theme even if they decide to change it later on. This
      // time Zettlr will only trigger a theme change if we traversed from
      // daytime to nighttime, and leave out the question of whether or not dark
      // mode has been active or not.
      if (this._scheduleWasDark !== this._isItDark()) {
        // The schedule just changed -> change the theme
        global.config.set('darkTheme', this._isItDark())
        this._scheduleWasDark = this._isItDark()
      }
    }
    // Have a tick (tac)
    setTimeout(() => { this.tick() }, 1000)
  }

  /**
   * Parses the current auto dark mode start and end times for quick access.
   * @return {void} No return.
   */
  _recalculateSchedule () {
    let start = global.config.get('autoDarkModeStart').split(':')
    let end = global.config.get('autoDarkModeEnd').split(':')

    this._startHour = parseInt(start[0], 10)
    this._startMin = parseInt(start[1], 10)
    this._endHour = parseInt(end[0], 10)
    this._endMin = parseInt(end[1], 10)
  }

  /**
   * Returns true if, according to the schedule, Zettlr should now be in dark
   * mode.
   * @return {Boolean} Whether or not time indicates it should be dark now.
   */
  _isItDark () {
    let now = new Date()
    let nowMin = now.getMinutes()
    let nowHours = now.getHours()

    return (nowHours >= this._startHour && nowMin >= this._startMin &&
        nowHours <= this._endHour && nowMin <= this._endMin)
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Always returns true
   */
  shutdown () { return true }
}

module.exports = new AppearanceProvider()
