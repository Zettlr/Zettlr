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

const ZettlrCommand = require('./zettlr-command')

class DirNewProject extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-new-project')
  }

  /**
    * Create a new project for a directory.
    * @param  {Object} arg The hash of a directory.
    */
  run (arg) {
    let dir = this._app.findDir(arg)
    if (dir) {
      dir.makeProject()
      this._app.ipc.send('paths-update', this._app.getPathDummies())
    }
  }
}

module.exports = DirNewProject
