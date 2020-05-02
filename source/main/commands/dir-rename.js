/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        DirRename command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command renames a directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')
const path = require('path')
const hash = require('../../common/util/hash')
const sanitize = require('sanitize-filename')

class DirRename extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-rename')
  }

  /**
   * Rename a directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt, arg) {
    let sourceDir = this._app.findDir(arg.hash)
    if (!sourceDir) {
      global.log.error('Could not rename directory: Not found.')
      return false
    }

    let wasCurrentDir = this._app.getCurrentDir() === sourceDir

    arg.name = sanitize(arg.name, { replacement: '-' })

    try {
      await this._app.getFileSystem().runAction('rename-directory', {
        'source': sourceDir,
        'info': { 'name': arg.name }
      })
    } catch (e) {
      this._app.window.prompt({
        type: 'error',
        title: e.name,
        message: e.message
      })
      return false
    }

    // Now the dir should be created -> Send an update to the renderer
    // and set the new dir as current.
    global.application.dirUpdate(sourceDir.parent.hash, sourceDir.parent.hash)
    let newDirHash = hash(path.join(sourceDir.parent.path, arg.name))
    if (wasCurrentDir) this._app.setCurrentDir(this._app.findDir(newDirHash))
    return true
  }
}

module.exports = DirRename
