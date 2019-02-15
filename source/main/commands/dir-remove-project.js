const ZettlrCommand = require('./zettlr-command')

class DirRemoveProject extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-remove-project')
  }

  /**
    * Remove the project of a directory
    * @param  {Object} arg The hash of a directory.
    */
  run (arg) {
    let dir = this._app.findDir(arg)
    if (dir) {
      dir.removeProject()
      this._app.ipc.send('paths-update', this._app.getPathDummies())
    }
  }
}

module.exports = DirRemoveProject
