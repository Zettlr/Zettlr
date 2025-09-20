/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirNewProject command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new project
 *
 * END HEADER
 */

import type { AppServiceContainer } from 'source/app/app-service-container'
import ZettlrCommand from './zettlr-command'

export default class DirNewProject extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'dir-new-project')
  }

  /**
    * Create a new project for a directory.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<void> {
    let dir = this._app.workspaces.findDir(arg.path)
    if (dir !== undefined) {
      // Create a new project, presetting the title with the directory name
      await this._app.fsal.createProject(dir, { title: dir.name })
    }
  }
}
