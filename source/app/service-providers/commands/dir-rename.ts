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

import path from 'path'
import ZettlrCommand from './zettlr-command'
import sanitize from 'sanitize-filename'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class DirRename extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-rename')
  }

  /**
   * Rename a directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt: string, arg: any): Promise<boolean> {
    const sourceDir = this._app.workspaces.findDir(arg.path)
    if (sourceDir === undefined) {
      this._app.log.error('Could not rename directory: Not found.')
      return false
    }

    const sanitizedName = sanitize(arg.name, { replacement: '-' })
    const newPath = path.join(path.dirname(arg.path), sanitizedName)

    // At this point no file is open in that directory anymore, so we can easily
    // rename the directory. The FSAL will reflect the changes.
    try {
      // Before renaming the dir, let's see if it is a workspace. Because if it
      // is, we have to close it first.
      const { openPaths } = this._app.config.getConfig()
      const isRoot = openPaths.includes(sourceDir.path)

      if (isRoot) {
        this._app.config.removePath(sourceDir.path)
      }

      await this._app.fsal.rename(arg.path, newPath)
      // Notify the documents provider so it can exchange any files if necessary
      await this._app.documents.hasMovedDir(arg.path, newPath)

      if (isRoot) {
        this._app.config.addPath(newPath)
      }
    } catch (err: any) {
      this._app.log.error(`Error during renaming file: ${err.message as string}`, err)
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
