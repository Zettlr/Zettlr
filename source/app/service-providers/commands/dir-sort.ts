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
import type { SortMethod } from 'source/types/common/fsal'

export default class DirSort extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-sort')
  }

  /**
    * Sorts a directory according to the argument
    *
    * @param  {string}  evt  The event name
    * @param  {any}     arg  An object containing both a path and a sorting type
    */
  async run (evt: string, arg: { path: string, sorting: SortMethod }): Promise<boolean> {
    const dir = await this._app.fsal.getAnyDirectoryDescriptor(arg.path, true)
    if (dir !== undefined) {
      await this._app.fsal.sortDirectory(dir, arg.sorting)
      return true
    }

    return false
  }
}
