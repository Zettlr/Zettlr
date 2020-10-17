/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirDelete command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

module.exports = class DirDelete extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-delete')
  }

  /**
    * Remove a directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt, arg) {
    let dirToDelete = this._app.findDir(arg.hash)
    if (dirToDelete === null) {
      global.log.error('Could not remove directory: Not found.')
      return false
    }

    // Now that all files are corresponding files are closed, we can
    // proceed to remove the directory.

    if (await this._app.window.confirmRemove(dirToDelete) === false) {
      return false
    }

    // First, remove the directory
    try {
      await this._app.getFileSystem().removeDir(dirToDelete)
      // await this._app.getFileSystem().runAction('remove-directory', {
      //   'source': dirToDelete,
      //   'info': null
      // })
    } catch (e) {
      console.error(e)
      return false
    }

    return true
  }
}
