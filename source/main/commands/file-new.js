/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new file.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')
const hash = require('../../common/util/hash')
const path = require('path')
const sanitize = require('sanitize-filename')
const ALLOWED_FILETYPES = require('../../common/data.json').filetypes

class FileNew extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-new')
  }

  /**
   * Create a new file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  async run (evt, arg) {
    let dir

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('hash')) {
      dir = this._app.findDir(arg.hash)
    } else {
      dir = this._app.getCurrentDir()
    }

    if (!dir) {
      global.log.error(`Could not create new file ${arg.name}: No directory selected!`)
      return false
    }

    try {
      // Then, make sure the name is correct.
      let filename = sanitize(arg.name, { 'replacement': '-' })
      if (filename.trim() === '') throw new Error('Could not create file: Filename was not valid')
      // If no valid filename is provided, assume .md
      if (!ALLOWED_FILETYPES.includes(path.extname(filename))) filename += '.md'

      // First create the file
      await this._app.getFileSystem().runAction('create-file', {
        'source': dir,
        'info': { 'name': filename }
      })

      // Then, send a directory update
      global.application.dirUpdate(dir.hash, dir.hash)

      // And directly thereafter, open the file
      let fileHash = hash(path.join(dir.path, filename))
      await this._app.openFile(fileHash)
    } catch (e) {
      global.log.error(trans('system.error.could_not_create_file') + ': ' + e.message)
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: e.message
      })
    }
  }
}

module.exports = FileNew
