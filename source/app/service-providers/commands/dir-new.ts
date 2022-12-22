/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new directory.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '@common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'

export default class DirNew extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-new')
  }

  /**
    * Create a new directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt: string, arg: any): Promise<boolean> {
    let sourceDir = this._app.fsal.findDir(arg.path)
    if (sourceDir === undefined) {
      this._app.log.error('Could not create directory: No source given.', arg)
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create directory'),
        message: trans('Could not create directory')
      })
      return false
    }

    const sanitizedName = (arg.name !== undefined) ? sanitize(arg.name.trim(), { replacement: '-' }) : trans('Untitled')

    if (sanitizedName.length === 0) {
      this._app.log.error('New directory name was empty after sanitization.', arg)
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create directory'),
        message: trans('Could not create directory')
      })
      return false
    }

    try {
      await this._app.fsal.createDir(sourceDir, sanitizedName)
    } catch (err: any) {
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create directory'),
        message: err.message
      })
      return false
    }

    // Now the dir should be created, the FSAL will automatically notify the
    // application of the changes, so all we have to do is set the directory
    // as the new current directory.
    let newDirPath = path.join(sourceDir.path, sanitizedName)
    this._app.fsal.openDirectory = this._app.fsal.findDir(newDirPath) ?? null

    return true
  }
}
