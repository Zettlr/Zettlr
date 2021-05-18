/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRemoveProject command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a project.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class DirRemoveProject extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-remove-project')
  }

  /**
    * Remove the project of a directory
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<void> {
    let dir = this._app.findDir(arg.path)
    if (dir !== null) {
      await this._app.getFileSystem().removeProject(dir)
    } else {
      global.log.error('Could not remove project: Could not find directory!')
    }
  }
}
