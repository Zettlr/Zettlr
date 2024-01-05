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
    this._app.documents.setOpenDirectory(dirPath)
  }
}
