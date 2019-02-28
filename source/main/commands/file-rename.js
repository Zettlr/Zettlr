/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileRename command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command renames a file.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class FileRename extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-rename')
  }

  /**
   * Rename a directory
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (arg) {
    // { 'hash': hash, 'name': val }
    let file = null
    let oldpath = ''

    // Possibilities: Non-opened file or opened file
    if (this._app.getCurrentFile() && (this._app.getCurrentFile().hash === parseInt(arg.hash))) {
      // Current file should be renamed.
      file = this._app.getCurrentFile()
      oldpath = file.path
      file.rename(arg.name)

      // Adapt window title (manually trigger a fileUpdate)
      this._app.window.fileUpdate()
    } else {
      // Non-open file should be renamed.
      file = this._app.findFile({ 'hash': parseInt(arg.hash) })
      oldpath = file.path
      file.rename(arg.name) // Done.
    }

    // A root has been renamed -> reflect in openPaths
    if (this._app.getPaths().includes(file)) {
      let oP = global.config.get('openPaths')
      for (let i = 0; i < oP.length; i++) {
        if (oP[i] === oldpath) {
          oP[i] = file.path
          global.config.set('openPaths', oP)
          break
        }
      }
    }

    // Replace all relevant properties of the renamed file in renderer.
    this._app.ipc.send('file-replace', { 'hash': parseInt(arg.hash), 'file': file.getMetadata() })

    if (this._app.getCurrentFile() && this._app.getCurrentFile().hash === parseInt(arg.hash)) {
      // Also "re-set" the current file to trigger some additional actions
      // necessary to reflect the changes throughout the app.
      this._app.setCurrentFile(this._app.getCurrentFile())
    }
  }
}

module.exports = FileRename
