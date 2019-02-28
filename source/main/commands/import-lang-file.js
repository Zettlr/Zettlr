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

const ZettlrCommand = require('./zettlr-command')
const path = require('path')
const fs = require('fs')
const bcp47 = require('bcp-47')
const { trans } = require('../../common/lang/i18n')
const { app } = require('electron')

class ImportLangFile extends ZettlrCommand {
  constructor (app) {
    super(app, 'import-lang-file')
  }

  /**
    * Imports language files into the application's data directory.
    */
  run () {
    let files = this.getWindow().askLangFile()
    let langDir = path.join(app.getPath('userData'), '/lang/')

    // First test if the lang directory already exists
    try {
      fs.lstatSync(langDir)
    } catch (e) {
      // Create
      fs.mkdirSync(langDir)
    }

    for (let f of files) {
      let schema = bcp47.parse(f)
      if (schema.language) {
        // It's a language file!
        try {
          fs.copyFileSync(f, path.join(langDir, path.basename(f)))
          global.ipc.notify(trans('system.lang_import_success', path.basename(f)))
        } catch (e) {
          global.ipc.notify(trans('system.lang_import_error', path.basename(f)))
        }
      } else {
        global.ipc.notify(trans('system.lang_import_error', path.basename(f)))
      }
    }
  }
}

module.exports = ImportLangFile
