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

import ZettlrCommand from './zettlr-command'

export default class FileDelete extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-delete')
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    let file = this._app.getFileSystem().findFile(arg.path)
    if (file === null) {
      global.log.error('Cannot delete file: Not found.')
      return false
    }

    if (!await this._app.confirmRemove(file)) {
      return false
    }

    // Now, remove the file
    await this._app.getFileSystem().removeFile(file)

    global.log.info(`Removed file ${file.name}.`)
    return true
  }
}
