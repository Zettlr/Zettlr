/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        UpdateProjectProperties command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command updates one or more project properties.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class UpdateProjectProperties extends ZettlrCommand {
  constructor (app) {
    super(app, 'update-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg) // Contains a hash property
    if (dir) dir.getProject().bulkSet(arg.properties)
  }
}

module.exports = UpdateProjectProperties
