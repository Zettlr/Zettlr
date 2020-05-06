/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileDuplicate command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command duplicates a file.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const { trans } = require('../../common/lang/i18n')
const hash = require('../../common/util/hash')
const ALLOWED_FILETYPES = require('../../common/data.json').filetypes
const path = require('path')
const sanitize = require('sanitize-filename')

class FileDuplicate extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-duplicate')
  }

  /**
   * Duplicate a file.
   * @param  {String} evt The event name
   * @param  {Object} arg An object containing all necessary information.
   * @return {void}     This function does not return anything.
   */
  async run (evt, arg) {
    // ARG structure: { dir, file, name }
    let dir = this._app.findDir(arg.dir)
    if (!dir) dir = this._app.getCurrentDir()
    if (!dir) {
      global.log.error('Could not create file, because no directory was found')
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'No directory provided'
      })
    }

    let file = this._app.findFile(arg.file) // File is only a hash
    if (!file) {
      global.log.error('Could not duplicate source file, because the source file was not found')
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'Could not duplicate source file, because the source file was not found'
      })
    }

    // Then, make sure the name is correct.
    let filename = sanitize(arg.name, { 'replacement': '-' })
    if (filename.trim() === '') throw new Error('Could not create file: Filename was not valid')
    // If no valid filename is provided, assume .md
    if (!ALLOWED_FILETYPES.includes(path.extname(filename))) filename += '.md'

    file = await this._app.getFileSystem().getFileContents(file)

    // First create the file
    await this._app.getFileSystem().runAction('duplicate-file', {
      'source': dir,
      'info': {
        'name': filename,
        'content': file.content
      }
    })

    // Then, send a directory update
    global.application.dirUpdate(dir.hash, dir.hash)

    // And directly thereafter, open the file
    let fileHash = hash(path.join(dir.path, filename))
    await this._app.openFile(fileHash)

    return true
  }
}

module.exports = FileDuplicate
