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
    // Find the directory, and apply the properties to it!
    let dir = this._app.findDir(arg.hash)
    if (dir) {
      this._app.getFileSystem().runAction('update-project', {
        'source': dir,
        'info': arg.properties
      })
    } else {
      global.log.warning(`Could not update project properties for ${arg.hash}: No directory found!`)
    }
  }
}

module.exports = UpdateProjectProperties
