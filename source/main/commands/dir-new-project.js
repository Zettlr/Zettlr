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
