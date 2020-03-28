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

const GettlrCommand = require('./Gettlr-command')

class FileDelete extends GettlrCommand {
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
    // First determine if this is modified.
    if (!this._app.canClose()) return false

    let hash
    if (arg.hasOwnProperty('hash')) {
      hash = arg.hash
    } else if (this._app.getCurrentFile()) {
      hash = this._app.getCurrentFile().hash
    }

    // No file to remove
    if (!hash) return false

    let file = this._app.findFile({ 'hash': parseInt(hash) })

    if (!await this._app.window.confirmRemove(file)) return false

    // Now that we are save, let's move the current file to trash.
    if (this._app.getCurrentFile() === file) {
      this._app.ipc.send('file-close', {})
      // Tell main & renderer to close file references
      this._app.setCurrentFile(null)
    }

    let parentDir = file.parent
    file.remove(true) // Also move the file to the trash
    global.application.dirUpdate(parentDir.hash, parentDir.getMetadata())
    return true
  }
}

module.exports = FileDelete
