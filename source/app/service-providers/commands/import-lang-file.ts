/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ImportLangFile command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command imports a new language file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import path from 'path'
import fs from 'fs'
import * as bcp47 from 'bcp-47'
import { trans } from '@common/i18n-main'
import { app } from 'electron'

export default class ImportLangFile extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'import-lang-file')
  }

  /**
    * Imports language files into the application's data directory.
    * @param {String} evt The event name
    * @param {Object} arg The arguments
    */
  async run (evt: string, arg: any): Promise<boolean> {
    let files
    try {
      files = await this._app.windows.askFile([
        { name: 'JSON File', extensions: ['json'] }
      ], true)
    } catch (err) {
      return false
    }

    let langDir = path.join(app.getPath('userData'), '/lang/')

    // First test if the lang directory already exists
    try {
      fs.lstatSync(langDir)
    } catch (err) {
      // Create
      fs.mkdirSync(langDir)
    }

    for (let f of files) {
      // Let's see if the filename resembles a bcp47 language tag
      let schema = bcp47.parse(path.basename(f, path.extname(f)))
      if (schema.language !== undefined) {
        // It's a language file!
        try {
          fs.copyFileSync(f, path.join(langDir, path.basename(f)))
          this._app.notifications.show(trans('system.lang_import_success', path.basename(f)))
        } catch (err) {
          this._app.notifications.show(trans('system.lang_import_error', path.basename(f)))
        }
      } else {
        this._app.notifications.show(trans('system.lang_import_error', path.basename(f)))
      }
    }

    return true
  }
}
