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

import ZettlrCommand from './zettlr-command'

export default class DirDelete extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-delete')
  }

  /**
    * Remove a directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    let dirToDelete = this._app.findDir(arg.hash)
    if (dirToDelete === null) {
      global.log.error('Could not remove directory: Not found.')
      return false
    }

    // Now that all files are corresponding files are closed, we can
    // proceed to remove the directory.

    if (!await this._app.confirmRemove(dirToDelete)) {
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
