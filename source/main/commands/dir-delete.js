/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirDelete command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command deletes a directory.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')

class DirDelete extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-delete')
  }

  /**
    * Create a new directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt, arg) {
    let hash = arg.hasOwnProperty('hash') ? arg.hash : this._app.getCurrentFile().hash
    let filedir = null
    let dir = null

    // First determine if this is modified.
    if (this._app.getCurrentFile() == null) {
      filedir = ''
    } else {
      filedir = this._app.getCurrentFile().parent // Oh I knew this would be clever :>
    }

    dir = this._app.findDir({ 'hash': parseInt(hash) })

    if (filedir === dir && !this._app.canClose()) {
      return false
    }

    if (!await this._app.window.confirmRemove(dir)) {
      return false
    }

    // Close the current file, if there is one open
    if ((this._app.getCurrentFile() != null) && dir.contains(this._app.getCurrentFile())) {
      this._app.closeFile()
    }

    if (dir === this._app.getCurrentDir() && !this._app.getCurrentDir().isRoot()) {
      this._app.setCurrentDir(dir.parent) // Move up one level
    } else if (dir === this._app.getCurrentDir() && this._app.getCurrentDir().isRoot()) {
      this._app.setCurrentDir(null) // Simply reset the current dir pointer
    }

    // Now that we are save, let's move the current directory to trash.
    global.watchdog.ignoreNext('unlinkDir', dir.path)

    dir.remove(dir, true)

    this._app.ipc.send('paths-update', this._app.getPathDummies())
    return true
  }
}

module.exports = DirDelete
