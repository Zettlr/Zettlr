/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileDelete command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a file.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class FileDelete extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-delete')
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt, arg) {
    let file = this._app.findFile(arg.hash)
    if (file === null) {
      global.log.error('Cannot delete file: Not found.')
      return false
    }

    if (await this._app.window.confirmRemove(file) === false) {
      return false
    }

    // Now, remove the file
    await this._app.getFileSystem().removeFile(file)

    global.log.info(`Removed file ${file.name}.`)
  }
}

module.exports = FileDelete
