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
    const sourceDir = this._app.fsal.findDir(arg.path)
    if (sourceDir === undefined) {
      this._app.log.error('Could not rename directory: Not found.')
      return false
    }

    const sanitizedName = sanitize(arg.name, { replacement: '-' })

    // At this point no file is open in that directory anymore, so we can easily
    // rename the directory. The FSAL will reflect the changes.
    try {
      await this._app.fsal.renameDir(sourceDir, sanitizedName)
    } catch (err: any) {
      console.error(err)
      this._app.windows.prompt({
        type: 'error',
        title: err.name,
        message: err.message
      })
      return false
    }

    return true
  }
}
