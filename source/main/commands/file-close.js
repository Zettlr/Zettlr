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

class FileClose extends ZettlrCommand {
  constructor (app) {
    super(app, [ 'file-close', 'file-close-all' ])
  }

  /**
   * Close an open file
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of the file to close.
   * @return {boolean}     True, if the file was successfully closed
   */
  async run (evt, arg) {
    if (evt === 'file-close-all') {
      // The renderer wants to close not just one, but all open files
      this._app.getFileSystem().closeAllFiles()
      return true
    }

    // Close one specific file
    try {
      if (!arg || !arg.hash) throw new Error('Could not close file! No hash provided!')
      let file = this._app.getFileSystem().findFile(arg.hash)
      if (file === null) {
        throw new Error(`Could not close file! No file with hash ${arg.hash} found!`)
      }

      // Now check if we can safely close the file
      if (file.modified) {
        // Ask the user if they REALLY want to close the file
        let ret = await this._app.getWindow().askSaveChanges(file.name)
        // The user does not want to close the file -> give them time to save
        if (ret === 0) return false
      }

      // If we're here the user really wants to close the file.
      if (!this._app.getFileSystem().closeFile(file)) {
        throw new Error('Could not close file!')
      } else {
        console.log('File closed successfully.')
      }

      return true
    } catch (e) {
      global.log.error(e.message, e)
      return false
    }
  }
}

module.exports = FileClose
