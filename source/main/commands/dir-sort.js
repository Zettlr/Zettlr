const ZettlrCommand = require('./zettlr-command')

class DirSort extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-sort')
  }

  /**
    * Sorts a directory according to the argument
    * @param  {Object} arg An object containing both a hash and a sorting type
    */
  run (arg) {
    if (!arg.hasOwnProperty('hash') || !arg.hasOwnProperty('type')) {
      return false
    }

    let dir = this._app.findDir({ 'hash': parseInt(arg.hash) })

    if (dir === null) return false

    dir.toggleSorting(arg.type)

    this._app.ipc.send('paths-update', this._app.getPathDummies())
  }
}

module.exports = DirSort
