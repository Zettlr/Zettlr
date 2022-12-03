/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        SetOpenDirectory command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Sets a directory as active
 *
 * END HEADER
 */

import { trans } from '@common/i18n-main'
import ZettlrCommand from './zettlr-command'

export default class SetOpenDirectory extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'set-open-directory')
  }

  /**
   * Sets the provided directory as the open one
   *
   * @param {string} evt      The event name
   * @param {string} dirPath  Must be the directory path
   */
  async run (evt: string, dirPath: string): Promise<void> {
    // arg contains a hash for a directory.
    const dir = this._app.fsal.findDir(dirPath)

    // Now send it back (the GUI should by itself filter out the files)
    if (dir !== undefined) {
      this._app.fsal.openDirectory = dir
    } else {
      this._app.log.error('Could not find directory', dirPath)
      this._app.windows.prompt({
        type: 'error',
        title: trans('Directory not found'),
        message: trans('The requested directory was not found.')
      })
    }
  }
}
