/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        IncreasePomodoro command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command increases the pomodoro count
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class IncreasePomodoro extends ZettlrCommand {
  constructor (app) {
    super(app, 'add-pomodoro')
  }

  /**
    * Increase the pomodoro counter.
    * @param {String} evt The event name
    * @param  {Object} arg Empty
    */
  run (evt, arg) {
    this._app.getStats().increasePomodoros()
  }
}

module.exports = IncreasePomodoro
