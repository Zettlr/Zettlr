/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateUserDictionary command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command updates one or more project properties.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class UpdateUserDictionary extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'update-user-dictionary')
  }

  /**
    * Updates the user dictionary
    * @param {String} evt The event name
    * @param  {Object} arg An array containing a new user dictionary.
    * @return {Boolean} Whether or not the call succeeded
    */
  async run (evt: string, arg: any): Promise<boolean> {
    if (!Array.isArray(arg)) {
      return false
    }

    return this._app.dictionary.setUserDictionary(arg)
  }
}
