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

import ZettlrCommand from './zettlr-command'

export default class IncreasePomodoro extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'add-pomodoro')
  }

  /**
    * Increase the pomodoro counter.
    * @param {String} evt The event name
    * @param  {Object} arg Empty
    */
  async run (event: string, _arg: any): Promise<void> {
    this._app.stats.increasePomodoros()
  }
}
