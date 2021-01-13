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

import ZettlrCommand from './zettlr-command'
import { enumDictFiles, enumLangFiles } from '../../common/i18n'

export default class GetPreferences extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'get-preferences')
  }

  /**
    * Send the global preferences to the renderer
    * @param {String} evt The event name.
    * @param {Object} arg The argument given to the command.
    */
  async run (evt: string, arg: any): Promise<void> {
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
