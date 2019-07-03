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
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (evt, arg) {
    // { 'hash': hash, 'name': val }
    let oldpath = ''

    let file = this._app.findFile({ 'hash': parseInt(arg.hash) })
    if (!file) return console.error(`Could not find file ${arg.hash}`)

    oldpath = file.path
    file.rename(arg.name) // Done.

    // A root has been renamed -> replace the old path with the new one.
    if (file.isRoot()) {
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
    global.application.fileUpdate(arg.hash, file.getMetadata())

    if (file === this._app.getCurrentFile()) {
      // Also "re-set" the current file to trigger some additional
      // actions necessary to reflect the changes throughout the app.
      this._app.setCurrentFile(this._app.getCurrentFile())
      // Adapt window title (manually trigger a fileUpdate)
      this._app.window.fileUpdate()
    }
  }
}

module.exports = FileRename
