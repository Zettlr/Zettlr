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

import ZettlrCommand from './zettlr-command'

export default class FileClose extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'file-close', 'file-close-all' ])
  }

  /**
   * Close an open file
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of the file to close.
   * @return {boolean}     True, if the file was successfully closed
   */
  async run (evt: string, arg: any): Promise<boolean> {
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
        throw new Error(`Could not close file! No file with hash ${String(arg.hash)} found!`)
      }

      // Now check if we can safely close the file
      if (file.modified) {
        global.log.error('[Command] Could not close file: The file has the modified flag set.')
        return false
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
