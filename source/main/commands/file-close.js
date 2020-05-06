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
    console.log('Closing file ...')
    try {
      if (!arg || !arg.hash) throw new Error('Could not close file! No hash provided!')
      console.log('Hash checks out')
      let file = this._app.getFileSystem().findFile(arg.hash)
      console.log('File found')
      if (!file) throw new Error(`Could not close file! No file with hash ${arg.hash} found!`)

      if (this._app.getFileSystem().closeFile(file)) {
        console.log('File closed successfully')
        global.config.removeFile(file.path)
        // We do not need to explicitly close the file now, because the file
        // system will notify the application that the openFiles array has
        // changed, which will trigger a synchronisation command.
      } else {
        console.log('File not closed.')
        throw new Error('Could not close file! Not open.')
      }
    } catch (e) {
      console.log(e)
    }
  }
}

module.exports = FileClose
