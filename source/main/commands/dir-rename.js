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

const GettlrCommand = require('./Gettlr-command')
const path = require('path')
const hash = require('../../common/util/hash')

class DirRename extends GettlrCommand {
  constructor (app) {
    super(app, 'dir-rename')
  }

  /**
   * Rename a directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  run (evt, arg) {
    // { 'hash': hash, 'name': val }
    let dir = this._app.findDir({ 'hash': parseInt(arg.hash) })
    if (!dir) {
      global.log.error(`Could not rename directory ${arg.hash} -- not found!`)
      return // Something went wrong
    }

    let containingDirectory = path.dirname(dir.path)

    // Save for later whether this is the currentDir (have to re-send dir list)
    let isCurDir = dir === this._app.getCurrentDir()
    let oldPath

    if (dir.contains(this._app.getCurrentFile())) {
      // The current file is in said dir so we need to trick a little bit
      oldPath = this._app.getCurrentFile().path
      let relative = oldPath.replace(dir.path, '') // Remove old directory to get relative path
      // Re-merge:
      oldPath = path.join(containingDirectory, arg.name, relative) // New path now
    }

    // Move to same location with different name
    dir.move(containingDirectory, arg.name).then(() => {
      if (!dir.isRoot()) {
        // Update the parent, because the file sorting might have changed
        global.application.dirUpdate(dir.parent.hash, dir.parent.getMetadata())
      } else {
        // We got a root, so there's no parent to update
        global.application.dirUpdate(arg.hash, dir.getMetadata())
      }

      // We need to explicitly re-set the dir, as only by this the
      // newly generated hash will be available throughout the app.
      if (isCurDir) this._app.setCurrentDir(dir)

      if (oldPath) {
        // Re-set the current file
        let nfile = dir.findFile({ 'hash': hash(oldPath) })
        this._app.setCurrentFile(nfile)
      }
    })

    return true
  }
}

module.exports = DirRename
