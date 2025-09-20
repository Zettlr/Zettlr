/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirDelete command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a directory.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-main'
import { type MessageBoxOptions, dialog } from 'electron'
import ZettlrCommand from './zettlr-command'
import path from 'path'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class DirDelete extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-delete')
  }

  /**
    * Remove a directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    const dirName = path.basename(arg.path)
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: [
        trans('Ok'),
        trans('Cancel')
      ],
      defaultId: 0,
      cancelId: 1,
      title: trans('Really delete?'),
      message: trans('Do you really want to remove %s?', dirName)
    }

    const response = await dialog.showMessageBox(options)
    if (response.response !== 0) {
      return false
    }

    try {
      await this._app.fsal.removeDir(arg.path)
    } catch (err: any) {
      this._app.log.error(err.message, err)
      return false
    }

    return true
  }
}
