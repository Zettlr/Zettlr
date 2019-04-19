/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileDeleteFromVD command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command removes a file from a virtual directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class FileDeleteFromVD extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-delete-from-vd')
  }

  /**
   * Remove a file from a virtual directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (evt, arg) {
    if (!arg.hasOwnProperty('hash') || !arg.hasOwnProperty('virtualdir')) return false
    let vd = this._app.findDir({ 'hash': parseInt(arg.virtualdir) })
    let file = null
    if (vd) {
      file = vd.findFile({ 'hash': parseInt(arg.hash) })
    } else {
      return false
    }

    if (vd && file) {
      vd.remove(file)
      this._app.ipc.send('paths-update', this._app.getPathDummies())
      return true
    }
    return false
  }
}

module.exports = FileDeleteFromVD
