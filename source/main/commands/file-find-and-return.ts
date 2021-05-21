/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileFindAndReturn command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command finds the absolute path of a file, and returns
 *                  the file's descriptor (including contents)
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { filetypes as FILETYPES } from '../../common/data.json'

export default class FilePathFind extends ZettlrCommand {
  constructor (app: any) {
    super(app, ['file-find-and-return'])
  }

  /**
      * Removes a file.
      * @param {String} evt The event name
      * @param  {Object} arg the parameters of the file to be deleted
      * @return {Boolean} Whether the file was successfully deleted.
      */
  async run (evt: string, arg: any): Promise<any> {
    // Initialise the file as the result of findExact failing
    let file
    // It might be linked by ID
    file = this._app.getFileSystem().findExact((arg as string), 'id')
    if (file !== undefined) {
      return await this._app.getFileSystem().getFileContents(file)
    }
    // It's not an ID, so search each type of file
    for (let type of FILETYPES) {
      file = this._app.getFileSystem().findExact((arg as string) + type, 'name')
      if (file !== undefined) {
        // If we find it, then return it
        return await this._app.getFileSystem().getFileContents(file)
      }
    }
    // We can't find it, so return Not Found
    return null
  }
}
