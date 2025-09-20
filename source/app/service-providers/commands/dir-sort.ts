/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirSort command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command applies the given sorting algorithm to a dir.
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class DirSort extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-sort')
  }

  /**
    * Sorts a directory according to the argument
    * @param {String} evt The event name
    * @param  {Object} arg An object containing both a hash and a sorting type
    */
  async run (evt: string, arg: any): Promise<boolean> {
    const dir = this._app.workspaces.findDir(arg.path)
    if (dir !== undefined) {
      await this._app.fsal.sortDirectory(dir, arg.sorting)
      return true
    }

    return false
  }
}
