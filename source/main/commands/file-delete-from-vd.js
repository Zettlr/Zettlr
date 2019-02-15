const ZettlrCommand = require('./zettlr-command')

class FileDeleteFromVD extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-delete-from-vd')
  }

  /**
   * Remove a file from a virtual directory
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (arg) {
    if (arg.hasOwnProperty('hash') && arg.hasOwnProperty('virtualdir')) return false
    let vd = this.findDir({ 'hash': parseInt(arg.virtualdir) })
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
