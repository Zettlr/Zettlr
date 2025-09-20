/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RequestMove command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command moves a file or directory.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import path from 'path'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class RequestMove extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'request-move')
  }

  /**
   * Move a directory around. Or a file.
   * @param {String} evt The event name
   * @param  {Object} arg The origin and the destination
   * @return {Boolean}     Whether or not the command succeeded.
   */
  async run (evt: string, arg: { from: string, to: string }): Promise<boolean> {
    // arg contains from and to. Prepare the necessary variables
    const from = this._app.workspaces.find(arg.from)
    const to = this._app.workspaces.findDir(arg.to)

    if (to === undefined || from === undefined) {
      // If findDir doesn't return anything then it's a file
      this._app.log.error('Could not find the target directory for moving.')
      return false
    }

    // It can happen that the user begins to drag a file but then realizes they
    // don't want to move the file, so they will just drop it in the origin
    // directory. Without the following check they would be presented with an
    // unwanted "file already exists in target directory"-message.
    if (to.path === from.dir) {
      return false
    }

    // Let's check if the destination is a child of the source:
    if (from.type === 'directory' && to.path.startsWith(from.path)) {
      this._app.windows.prompt({
        type: 'error',
        title: trans('Cannot move directory'),
        message: trans('You cannot move a directory into one of its subdirectories.')
      })
      return false
    }

    // Now check if there already is a directory/file with the same name
    if (to.children.find(c => c.name === path.basename(from.name)) !== undefined) {
      this._app.windows.prompt({
        type: 'error',
        title: trans('Cannot move directory or file'),
        message: trans('The file/directory %s already exists in target.', from.name)
      })

      return false
    }

    // A final check: If from is a file, and the file is modified, we cannot
    // move, lest we want to induce data loss, see issue #2347
    if (this._app.documents.isModified(arg.from)) {
      this._app.log.error(`[Application] Cannot move file ${arg.from} to ${arg.to}, since it is modified.`)
      return false
    }

    // Now we can move the source to the target.
    const newPath = path.join(to.path, from.name)
    await this._app.fsal.rename(from.path, newPath)
    // Notify the documents provider so it can exchange any files if necessary
    if (await this._app.fsal.isFile(newPath)) {
      await this._app.documents.hasMovedFile(from.path, newPath)
    } else {
      await this._app.documents.hasMovedDir(from.path, newPath)
    }

    return true
  }
}
