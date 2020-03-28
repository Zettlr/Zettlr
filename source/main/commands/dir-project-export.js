/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirProjectExport command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command exports a directory as project.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')

class DirProjectExport extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-project-export')
  }

  /**
    * Exports the current project.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg) // Contains a hash propety
    if (dir) {
      dir.getProject().build()
      global.ipc.notify('Building project ...')
    }
  }
}

module.exports = DirProjectExport
