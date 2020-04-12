/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirNewProject command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new project
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class DirNewProject extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-new-project')
  }

  /**
    * Create a new project for a directory.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg.hash)
    if (dir) {
      this._app.getFileSystem().runAction('create-project', {
        'source': dir,
        // Preset the project settings with some preliminary info
        'info': {
          'title': dir.name
        }
      })
      global.application.dirUpdate(dir.hash, dir.hash)
    }
  }
}

module.exports = DirNewProject
