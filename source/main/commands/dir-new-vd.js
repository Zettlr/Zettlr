/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirNewVD command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new virtual directory.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')

class DirNewVD extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-new-vd')
  }

  /**
    * Creates a new virtual directory
    * @param {String} evt The event name
    * @param  {Object} arg The argument, containing both the containing hash and the new name
    */
  run (evt, arg) {
    let dir
    if (arg.hasOwnProperty('hash')) {
      dir = this._app.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      dir = this._app.getCurrentDir()
    }

    if (!dir) return false

    // Create the vd
    let vd = dir.addVirtualDir(arg.name)
    global.application.dirUpdate(dir.hash, dir.getMetadata())
    this._app.setCurrentDir(vd)
  }
}

module.exports = DirNewVD
