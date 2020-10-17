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

    // First, retrieve our source file
    let file = this._app.findFile(arg.file) // File is only a hash
    if (file === null) {
      global.log.error('Could not duplicate source file, because the source file was not found')
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'Could not duplicate file, because the source file was not found'
      })
      return
    }

    // Then, the target directory.
    let dir = this._app.findDir(arg.dir) // (1) A specified directory
    if (dir === null) dir = file.parent // (2) The source file's dir
    if (dir === null) dir = this._app.getCurrentDir() // (3) The current dir
    if (dir === null) { // (4) Fail
      global.log.error('Could not create file, because no directory was found')
      this._app.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'No directory provided'
      })
      return
    }

    // Afterwards, make sure the name is correct.
    let filename = sanitize(arg.name, { 'replacement': '-' })
    if (filename.trim() === '') {
      throw new Error('Could not create file: Filename was not valid')
    }

    // If no valid filename is provided, assume .md
    if (!ALLOWED_FILETYPES.includes(path.extname(filename))) {
      filename += '.md'
    }

    // Retrieve the file's content and create a new file with the same content
    const fileMeta = await this._app.getFileSystem().getFileContents(file)
    await this._app.getFileSystem().createFile(dir, {
      name: filename,
      content: fileMeta.content
    })

    // And directly thereafter, open the file
    let fileHash = hash(path.join(dir.path, filename))
    await this._app.openFile(fileHash)

    return true
  }
}

module.exports = FileDuplicate
