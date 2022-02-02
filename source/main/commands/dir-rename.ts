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
import path from 'path'

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
    const sourceDir = this._app.findDir(arg.path)
    if (sourceDir === null) {
      global.log.error('Could not rename directory: Not found.')
      return false
    }

    const sanitizedName = sanitize(arg.name, { replacement: '-' })
    const isRootDir = sourceDir.parent === null
    const oldPath = sourceDir.path
    const newPath = path.join(sourceDir.dir, sanitizedName)

    try {
      await this._app.getFileSystem().renameDir(sourceDir, sanitizedName)
    } catch (err: any) {
      console.error(err)
      this._app.prompt({
        type: 'error',
        title: err.name,
        message: err.message
      })
      return false
    }

    // At this point the directory has been correctly renamed. However, if we
    // just renamed a root directory, we have to exchange the old path for the
    // new one in the config as well.
    if (isRootDir) {
      global.config.removePath(oldPath)
      global.config.addPath(newPath)
      global.log.info(`[DirRename Command] Exchanged ${oldPath} with ${newPath} in config`)
    }

    return true
  }
}
