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
const expandOptionObject = require('../../common/util/expand-option-object')

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
    // The properties come from the renderer with dot notation, but the action
    // expects them already in their expanded state.
    let expanded = expandOptionObject(arg.properties)
    // Find the directory, and apply the properties to it!
    let dir = this._app.findDir(arg.hash)
    if (dir !== null) {
      this._app.getFileSystem().updateProject(dir, expanded)
    } else {
      global.log.warning(`Could not update project properties for ${arg.hash}: No directory found!`)
    }
  }
}

module.exports = UpdateProjectProperties
