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
const isDir = require('../../common/util/is-dir')
const { app, dialog } = require('electron')

class ImportLangFile extends ZettlrCommand {
  constructor (app) {
    super(app, 'import-lang-file')
  }

  /**
    * Imports language files into the application's data directory.
    * @param {String} evt The event name
    * @param {Object} arg The arguments
    */
  async run (evt, arg) {
    let files
    try {
      files = await this.askLangFile()
    } catch (err) {
      return false // The main window is not open
    }

    let langDir = path.join(app.getPath('userData'), '/lang/')

    // First test if the lang directory already exists
    try {
      fs.lstatSync(langDir)
    } catch (e) {
      // Create
      fs.mkdirSync(langDir)
    }

    for (let f of files) {
      // Let's see if the filename resembles a bcp47 language tag
      let schema = bcp47.parse(path.basename(f, path.extname(f)))
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

  /**
    * Asks for a language file to be imported to the app.
    * @return {Promise} A promise that resolves to an array of files.
    */
  async askLangFile () {
    if (!global.mainWindow) throw new Error('Main Window not open!')

    let startDir = app.getPath('desktop')
    if (isDir(global.config.get('dialogPaths.askLangFileDialog'))) {
      startDir = global.config.get('dialogPaths.askLangFileDialog')
    }

    let ret = await dialog.showOpenDialog(global.mainWindow, {
      'title': trans('system.import_lang_file'),
      'defaultPath': startDir,
      'filters': [
        { name: 'JSON File', extensions: ['json'] }
      ],
      'properties': [
        'openFile'
      ]
    })

    // Save the path of the containing dir of the first file into the config
    if (ret.filePaths.length > 0 && isDir(path.dirname(ret.filePaths[0]))) {
      global.config.set('dialogPaths.askLangFileDialog', ret.filePaths[0])
    }

    return ret.filePaths
  }
}

module.exports = ImportLangFile
