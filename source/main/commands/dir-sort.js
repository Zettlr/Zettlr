/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirSort command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command applies the given sorting algorithm to a dir.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class DirSort extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-sort')
  }

  /**
    * Sorts a directory according to the argument
    * @param {String} evt The event name
    * @param  {Object} arg An object containing both a hash and a sorting type
    */
  async run (evt, arg) {
    let dir = this._app.findDir(arg.hash)
    if (dir === null) return false

    await this._app.getFileSystem().sortDirectory(dir, arg.type)
  }
}

module.exports = DirSort
