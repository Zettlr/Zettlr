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

import ZettlrCommand from './zettlr-command'

export default class DirNewProject extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'dir-new-project')
  }

  /**
    * Create a new project for a directory.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  async run (evt: string, arg: any): Promise<void> {
    let dir = this._app.findDir(arg.hash)
    if (dir !== null) {
      // Create a new project, presetting the title with the directory name
      this._app.getFileSystem().createProject(dir, { 'title': dir.name })
    }
  }
}
