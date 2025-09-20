/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileDelete command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a file.
 *
 * END HEADER
 */

import { trans } from '@common/i18n-main'
import { type MessageBoxOptions, dialog } from 'electron'
import ZettlrCommand from './zettlr-command'
import path from 'path'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class FileDelete extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'file-delete')
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    const fileName = path.basename(arg.path)
    const options: MessageBoxOptions = {
      type: 'warning',
      buttons: [
        trans('Ok'),
        trans('Cancel')
      ],
      defaultId: 0,
      cancelId: 1,
      title: trans('Really delete?'),
      message: trans('Do you really want to remove %s?', fileName)
    }

    const response = await dialog.showMessageBox(options)
    if (response.response !== 0) {
      return false
    }

    // Ensure the file is closed before removing
    this._app.documents.closeFileEverywhere(arg.path)

    // Now, remove the file
    await this._app.fsal.removeFile(arg.path)

    this._app.log.info(`Removed file ${fileName}.`)
    return true
  }
}
