/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ForceOpen command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command forces open a file, or creates it, if desired,
 *                  and opens it afterwards.
 *
 * END HEADER
 */

const path = require('path')
const ZettlrCommand = require('./zettlr-command')
const FileNew = require('./file-new')
const FILETYPES = require('../../common/data.json').filetypes

class ForceOpen extends ZettlrCommand {
  constructor (app) {
    super(app, 'force-open')
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt, arg) {
    let filename = arg.filename
    let create = arg.create
    // First try the ID
    let file = this._app.getFileSystem().findExact(filename, 'id')
    // No luck? Then try the name property
    if (!file) {
      file = this._app.getFileSystem().findExact(filename, 'name')
      let ext = path.extname(filename)
      if (ext.length > 1) {
        // file ending given
        file = this._app.getFileSystem().findExact(filename, 'name')
      } else {
        // No file ending given, so let's test all allowed
        for (let type of FILETYPES) {
          file = this._app.getFileSystem().findExact(filename + type, 'name')
          if (file) break
        }
      }
    }

    if (!file && create) {
      let dir = this._app.getCurrentDir()
      new FileNew(this._app).run('', { 'name': filename, 'hash': dir.hash })
    }

    // If any of this has worked,
    if (file != null) this._app.openFile(file.hash)
  }
}

module.exports = ForceOpen
