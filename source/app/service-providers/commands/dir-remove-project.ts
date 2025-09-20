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

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class DirRemoveProject extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-remove-project')
  }

  /**
    * Remove the project of a directory
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<void> {
    let dir = this._app.workspaces.findDir(arg.path)
    if (dir !== undefined) {
      await this._app.fsal.removeProject(dir)
    } else {
      this._app.log.error('Could not remove project: Could not find directory!')
    }
  }
}
