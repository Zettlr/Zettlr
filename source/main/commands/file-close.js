/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileClose command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command closes one of the open files.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class FileNew extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-close')
  }

  /**
   * Close an open file
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of the file to close.
   * @return {void}     This function does not return anything.
   */
  run (evt, arg) {
    // Close the file
    if (!arg || !arg.hash) throw new Error('Could not close file! No hash provided!')

    let file = this._app.getFileSystem().findFile(arg.hash)
    if (!file) throw new Error(`Could not close file! No file with hash ${arg.hash} found!`)

    if (this._app.getFileSystem().closeFile(file)) {
      // Tell the renderer to close the file!
      global.ipc.send('file-close', { 'hash': file.hash })
    } else {
      throw new Error('Could not close file! Not open.')
    }
  }
}

module.exports = FileNew
