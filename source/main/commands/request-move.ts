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
import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '@dts/main/fsal'

export default class RequestMove extends ZettlrCommand {
  constructor (app: any) {
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
    const fsal = this._app.getFileSystem() // We need this quite often here

    let from: MDFileDescriptor|CodeFileDescriptor|DirDescriptor|null = fsal.findDir(arg.from)
    // Obviously a file!
    if (from == null) {
      from = fsal.findFile(arg.from)
    }

    let to = this._app.findDir(arg.to)

    if (to === null || from === null) {
      // If findDir doesn't return anything then it's a file
      global.log.error('Could not find the target directory for moving.')
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
    if (fsal.findFile(to.path, [from]) !== null || fsal.findDir(to.path, [from]) !== null) {
      this._app.prompt({
        type: 'error',
        title: trans('system.error.move_into_child_title'),
        message: trans('system.error.move_into_child_message')
      })
      return false
    }

    // Now check if there already is a directory/file with the same name
    if (fsal.hasChild(to, from)) {
      this._app.prompt({
        type: 'error',
        title: trans('system.error.already_exists_title'),
        message: trans('system.error.already_exists_message', from.name)
      })

      return false
    }

    // A final check: If from is a file, and the file is modified, we cannot
    // move, lest we want to induce data loss, see issue #2347
    const openFile = this._app.getDocumentManager().openFiles.find(elem => elem.path === arg.from)
    if (openFile?.modified === true) {
      global.log.error(`[Application] Cannot move file ${arg.from} to ${arg.to}, since it is modified.`)
      return false
    }

    // Now we can move the source to the target.
    await fsal.move(from, to)
    return true
  }
}
