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

const ZettlrCommand = require('./zettlr-command')

class DirDelete extends ZettlrCommand {
  constructor (app) {
    super(app, 'dir-delete')
  }

  /**
    * Remove a directory.
    * @param {String} evt The event name
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  async run (evt, arg) {
    let dirToDelete = this._app.findDir(arg.hash)
    if (!dirToDelete) {
      global.log.error('Could not remove directory: Not found.')
      return false
    }

    let isCurrentDir = dirToDelete === this._app.getCurrentDir()

    // Now we need to figure out if any currently opened
    // files are within the directory to delete. If so,
    // we need to close them before removing the directory
    // to not create fissures in the time-space-continuum.
    let filesToClose = []
    for (let fileHash of this._app.getFileSystem().getOpenFiles()) {
      // For each file, simply traverse up the parent property
      // and add it to the close array if any of them is the dirToDelete
      let file = this._app.findFile(fileHash)
      let parent = file.parent
      while (parent != null) {
        if (parent === dirToDelete) {
          filesToClose.push(file)
          break
        }
        parent = parent.parent
      }
    }

    // Sooo, we now know which files to close, so do it. We can hijack
    // the corresponding command for that.
    for (let file of filesToClose) {
      await this._app.runCommand('file-close', { 'hash': file.hash })
    }

    // Now that all files are corresponding files are closed, we can
    // proceed to remove the directory.
    let parentDir = dirToDelete.parent

    if (!await this._app.window.confirmRemove(dirToDelete)) return false

    // First, remove the directory
    try {
      await this._app.getFileSystem().runAction('remove-directory', {
        'source': dirToDelete,
        'info': null
      })
    } catch (e) {
      console.error(e)
      return false
    }

    // Now determine if we need to splice it from the openPaths as well
    if (!parentDir) {
      // This is taken from the root-close command
      this._app.getFileSystem().unloadPath(dirToDelete)
      global.config.removePath(dirToDelete.path)
    }

    // Notify the renderer
    if (parentDir) {
      global.application.dirUpdate(parentDir.hash, parentDir.hash)
      // Set a correct new dir
      if (isCurrentDir) this._app.setCurrentDir(parentDir)
    } else {
      global.application.notifyChange('Successfully removed root ' + dirToDelete.name)
    }
    return true
  }
}

module.exports = DirDelete
