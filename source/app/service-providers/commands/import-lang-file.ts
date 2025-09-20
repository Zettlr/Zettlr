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
import { showNativeNotification } from '@common/util/show-notification'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class ImportLangFile extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'import-lang-file')
  }

  /**
    * Imports language files into the application's data directory.
    * @param {String} evt The event name
    * @param {Object} arg The arguments
    */
  async run (event: string, _arg: any): Promise<boolean> {
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
          showNativeNotification(trans('Language file imported: %s', path.basename(f)))
        } catch (err) {
          showNativeNotification(trans('Could not import language file %s!', path.basename(f)))
        }
      } else {
        showNativeNotification(trans('Could not import language file %s!', path.basename(f)))
      }
    }

    return true
  }
}
