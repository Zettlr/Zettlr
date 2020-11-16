/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirProjectProperties command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command displays project properties.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class DirProjectProperties extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg.hash)
    if (dir !== null) {
      arg.properties = dir._settings.project
      // Send the properties back to the renderer
      global.ipc.send('project-properties', arg)
    } else {
      global.log.warning(`Cannot open project properties for hash ${arg.hash}: No directory found.`)
    }
  }
}

module.exports = DirProjectProperties
