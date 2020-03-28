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

const GettlrCommand = require('./Gettlr-command')

class DirSort extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-sort')
  }

  /**
    * Sorts a directory according to the argument
    * @param {String} evt The event name
    * @param  {Object} arg An object containing both a hash and a sorting type
    */
  run (evt, arg) {
    if (!arg.hasOwnProperty('hash') || !arg.hasOwnProperty('type')) {
      return false
    }

    let dir = this._app.findDir({ 'hash': parseInt(arg.hash) })

    if (dir === null) return false

    dir.toggleSorting(arg.type)

    global.application.dirUpdate(dir.hash, dir.getMetadata())
  }
}

module.exports = DirSort
