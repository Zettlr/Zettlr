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
    const deadDir = this._app.fsal.findDir(arg.path)
    if (deadDir === undefined) {
      this._app.log.error('Could not find directory descriptor to rescan.')
      return
    }

    await this._app.fsal.rescanForDirectory(deadDir)
  }
}
