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
    *
    * @param  {string} evt  The event name
    * @param  {any}    arg  The payload
    */
  async run (evt: string, arg: { path: string }): Promise<void> {
    let dir = await this._app.fsal.getAnyDirectoryDescriptor(arg.path)
    if (dir !== undefined) {
      await this._app.fsal.removeProject(dir)
    } else {
      this._app.log.error('Could not remove project: Could not find directory!')
    }
  }
}
