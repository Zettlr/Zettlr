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

const GettlrCommand = require('./Gettlr-command')

class DirProjectProperties extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-project-properties')
  }

  /**
    * Display the project settings
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg)
    if (dir) {
      arg.properties = dir.getProject().getProperties()
      this._app.ipc.send('project-properties', arg) // Now cnt not only contains hash, but also the properties
    }
  }
}

module.exports = DirProjectProperties
