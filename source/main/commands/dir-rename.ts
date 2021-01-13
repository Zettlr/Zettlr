/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRename command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command renames a directory.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import sanitize from 'sanitize-filename'

export default class DirRename extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-rename')
  }

  /**
   * Rename a directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt: string, arg: any): Promise<boolean> {
    let sourceDir = this._app.findDir(arg.hash)
    if (sourceDir === null) {
      global.log.error('Could not rename directory: Not found.')
      return false
    }

    const sanitizedName = sanitize(arg.name, { replacement: '-' })

    try {
      await this._app.getFileSystem().renameDir(sourceDir, sanitizedName)
    } catch (e) {
      console.error(e)
      this._app.prompt({
        type: 'error',
        title: e.name,
        message: e.message
      })
      return false
    }

    return true
  }
}
