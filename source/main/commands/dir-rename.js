const ZettlrCommand = require('./zettlr-command')
const path = require('path')
const { hash } = require('../../common/zettlr-helpers.js')

class DirRename extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-rename')
  }

  /**
   * Rename a directory
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (arg) {
    // { 'hash': hash, 'name': val }
    let dir = this._app.findDir({ 'hash': parseInt(arg.hash) })

    let oldDir = path.dirname(dir.path)

    // Save for later whether this is the currentDir (have to re-send dir list)
    let isCurDir = ((this._app.getCurrentDir() != null) && (dir.hash === this._app.getCurrentDir().hash))
    let oldPath = null

    if ((this._app.getCurrentFile() !== null) && (dir.findFile({ 'hash': this._app.getCurrentFile().hash }) !== null)) {
      // The current file is in said dir so we need to trick a little bit
      oldPath = this._app.getCurrentFile().path
      let relative = oldPath.replace(dir.path, '') // Remove old directory to get relative path
      // Re-merge:
      oldPath = path.join(oldDir, arg.name, relative) // New path now
    }

    // Move to same location with different name
    dir.move(oldDir, arg.name)

    this._app.ipc.send('paths-update', this._app.getPathDummies())

    if (isCurDir) this._app.setCurrentDir(dir)

    if (oldPath != null) {
      // Re-set current file in the client
      let nfile = dir.findFile({ 'hash': hash(oldPath) })
      this._app.setCurrentFile(nfile)
    }

    return true
  }
}

module.exports = DirRename
