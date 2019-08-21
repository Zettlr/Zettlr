/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RootClose command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command closes a root file or directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class RootClose extends ZettlrCommand {
  constructor (app) {
    super(app, 'root-close')
  }

  /**
    * Closes (not removes) either a directory or a file.
    * @param {String} evt The event name
    * @param  {Object} arg The hash of a root directory or file.
    */
  run (evt, arg) {
    arg = parseInt(arg)
    for (let p of this._app.getPaths()) {
      if (p.getHash() === arg) {
        // If it's the current file, close it
        if (p === this._app.getCurrentFile()) {
          global.ipc.send('file-close')
          this._app.getWindow().fileUpdate()
        }
        if (p === this._app.getCurrentDir()) {
          this._app.setCurrentDir(null)
        }
        global.config.removePath(p.getPath())
        this._app.getPaths().splice(this._app.getPaths().indexOf(p), 1)
        global.ipc.send('paths-update', this._app.getPathDummies())
        return true
      }
    }
    return false
  }
}

module.exports = RootClose
