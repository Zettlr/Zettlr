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

const ZettlrCommand = require('./zettlr-command')

class UpdateUserDictionary extends ZettlrCommand {
  constructor (app) {
    super(app, 'update-user-dictionary')
  }

  /**
    * Updates the user dictionary
    * @param {String} evt The event name
    * @param  {Object} arg An array containing a new user dictionary.
    * @return {Boolean} Whether or not the call succeeded
    */
  run (evt, arg) {
    if (!Array.isArray(arg)) return false
    return global.dict.setUserDictionary(arg)
  }
}

module.exports = UpdateUserDictionary
