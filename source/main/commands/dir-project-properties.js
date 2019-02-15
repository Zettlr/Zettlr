const ZettlrCommand = require('./zettlr-command')

class DirProjectProperties extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-project-properties')
  }

  /**
    * Display the project settings
    * @param  {Object} arg The hash of a directory.
    */
  run (arg) {
    let dir = this._app.findDir(arg)
    if (dir) {
      arg.properties = dir.getProject().getProperties()
      this._app.ipc.send('project-properties', arg) // Now cnt not only contains hash, but also the properties
    }
  }
}

module.exports = DirProjectProperties
