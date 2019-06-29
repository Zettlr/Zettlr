/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GetPreferences command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command sends the preferences to the renderer.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { enumDictFiles, enumLangFiles } = require('../../common/lang/i18n')

class GetPreferences extends ZettlrCommand {
  constructor (app) {
    super(app, 'get-preferences')
  }

  /**
    * Send the global preferences to the renderer
    * @param {String} evt The event name.
    * @param {Object} arg The argument given to the command.
    */
  run (evt, arg) {
    // get() with no arguments returns the whole config
    let toSend = global.config.get()
    // Add available translations and dictionaries
    toSend.supportedLangs = enumLangFiles().map(elem => elem.tag)
    toSend.availableDicts = enumDictFiles().map(elem => elem.tag)
    toSend.userDictionary = global.dict.getUserDictionary()
    toSend.availableLanguages = global.translations.getAvailableLanguages()
    global.ipc.send('preferences', toSend)
  }
}

module.exports = GetPreferences
