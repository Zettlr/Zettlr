const ZettlrCommand = require('./zettlr-command')

class UpdateProjectProperties extends ZettlrCommand {
  constructor (app) {
    super(app, 'update-project-properties')
  }

  /**
    * Display the project settings
    * @param  {Object} arg The hash of a directory.
    */
  run (arg) {
    let dir = this._app.findDir(arg) // Contains a hash property
    if (dir) dir.getProject().bulkSet(arg.properties)
  }
}

module.exports = UpdateProjectProperties
