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

const GettlrCommand = require('./Gettlr-command')

class RootClose extends GettlrCommand {
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
          // We need to select another directory so
          // that the user is not confused in thin mode
          // that "no directory is selected" (because it
          // will appear as if the whole directory tree
          // has been offloaded and you need to restart
          // the app).
          let index = this._app.getPaths().indexOf(p)
          if (index > 0) {
            // Select the previous root directory
            this._app.setCurrentDir(this._app.getPaths()[index - 1])
          } else if (this._app.getPaths().length > 1) {
            // Select the next one
            this._app.setCurrentDir(this._app.getPaths()[index++])
          } else {
            // Fallback (if there's only one root): Set to null
            this._app.setCurrentDir(null)
          }
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
