/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRemoveProject command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a project.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class DirRemoveProject extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-remove-project')
  }

  /**
    * Remove the project of a directory
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a directory.
    */
  run (evt, arg) {
    let dir = this._app.findDir(arg.hash)
    if (dir) {
      this._app.getFileSystem().runAction('remove-project', {
        'source': dir,
        'info': null
      })
      global.application.dirUpdate(dir.hash, dir.hash)
    } else {
      global.log.error('Could not remove project: Could not find directory!')
    }
  }
}

module.exports = DirRemoveProject
