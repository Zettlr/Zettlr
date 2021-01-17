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
import { trans } from '../../common/i18n'
import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '../modules/fsal/types'

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
  async run (evt: string, arg: any): Promise<boolean> {
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

    // Let's check if the destination is a child of the source:
    if (fsal.findFile(to.hash, [from]) !== null || fsal.findDir(to.hash, [from]) !== null) {
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

    // Now we can move the source to the target.
    await fsal.move(from, to)
    return true
  }
}
