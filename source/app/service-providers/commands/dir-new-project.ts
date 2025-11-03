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
    *
    * @param  {string}  evt  The event name
    * @param  {any}     arg  The payload
    */
  async run (evt: string, arg: { path: string }): Promise<void> {
    const dir = await this._app.fsal.getAnyDirectoryDescriptor(arg.path)
    if (dir !== undefined) {
      // Create a new project, presetting the title with the directory name
      await this._app.fsal.createProject(dir, { title: dir.name })
    }
  }
}
