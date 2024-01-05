/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRescan command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command rescans a not-found directory.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class DirRescan extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'rescan-dir')
  }

  /**
    * Rescans a directory
    * @param {String} evt The event name
    * @param  {Object} arg The path of the descriptor
    */
  async run (evt: string, arg: any): Promise<void> {
    await this._app.workspaces.rescanForDirectory(arg.path)
  }
}
