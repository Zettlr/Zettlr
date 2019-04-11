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
 * This class manages the coloured tags of the app. It reads the tags on each
 * start of the app and writes them after they have been changed.
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
    // - sunrise/sunset: Basically schedule, only calculated based on timezone

    this._mode = 'system' // global.config.get('autoDarkMode')
    this._isDarkMode = global.config.get('darkTheme')
    this.calculateSchedule()

    global.config.on('update', (option) => {
      // Set internal vars accordingly
      if (option === 'autoDarkMode') this._mode = global.config.get('autoDarkMode')
      if (option === 'darkTheme') this._isDarkMode = global.config.get('darkTheme')
    })

    // new Date().getTimezoneOffset() <-- This returns the LOCAL timezone offset in minutes, so divide by 60 then you have the hours
    this.tick() // Begin the tick
  }

  tick () {
    if (this._mode === 'system' && process.platform === 'darwin') {
      if (systemPreferences.isDarkMode() && !this._isDarkMode) {
        global.config.set('darkTheme', true)
      }

      if (!systemPreferences.isDarkMode() && this._isDarkMode) {
        global.config.set('darkTheme', false)
      }
    } else if (this._mode === 'schedule') {
      // First get the current time index
      // 2. If now between start and end and not in dark mode, enter it
      // 3. Else if dark mode true: Leave it
      // let now = new Date()
    }
    // Have a tick every two seconds
    setTimeout(() => { this.tick() }, 2000)
  }

  calculateSchedule () {
    let start = global.config.get('autoDarkModeStart').split(':')
    let end = global.config.get('autoDarkModeEnd').split(':')

    this._startHour = parseInt(start[0], 10)
    this._startMin = parseInt(start[1], 10)
    this._endHour = parseInt(end[0], 10)
    this._endMin = parseInt(end[1], 10)
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Always returns true
   */
  shutdown () { return true }
}

module.exports = new AppearanceProvider()
