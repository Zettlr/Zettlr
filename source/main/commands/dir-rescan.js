/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRescan command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command rescans a not-found directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class DirRescan extends ZettlrCommand {
  constructor (app) {
    super(app, 'rescan-dir')
  }

  /**
    * Rescans a directory
    * @param {String} evt The event name
    * @param  {Object} arg The hash of the descriptor
    */
  async run (evt, arg) {
    const deadDir = this._app.getFileSystem().findDir(arg)
    if (deadDir === null) {
      global.log.error('Could not find directory descriptor to rescan.')
      return
    }

    this._app.getFileSystem().rescanForDirectory(deadDir)
  }
}

module.exports = DirRescan
