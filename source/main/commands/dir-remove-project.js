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

const GettlrCommand = require('./Gettlr-command')

class DirRemoveProject extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-remove-project')
  }

  /**
    * Remove the project of a directory
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg)
    if (dir) {
      dir.removeProject()
      this._app.ipc.send('paths-update', this._app.getPathDummies())
    }
  }
}

module.exports = DirRemoveProject
