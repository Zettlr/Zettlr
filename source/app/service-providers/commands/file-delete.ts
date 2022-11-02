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
    let file = this._app.fsal.findFile(arg.path)
    if (file === undefined) {
      this._app.log.error('Cannot delete file: Not found.')
      return false
    }

    if (!await this._app.windows.confirmRemove(file)) {
      return false
    }

    // Ensure the file is closed before removing
    this._app.documents.closeFileEverywhere(arg.path)

    // Now, remove the file
    await this._app.fsal.removeFile(file)

    this._app.log.info(`Removed file ${file.name}.`)
    return true
  }
}
