/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RootClose command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command closes a root file or directory.
 *
 * END HEADER
 */

const ZettlrCommand = require('./zettlr-command')

class RootClose extends ZettlrCommand {
  constructor (app) {
    super(app, 'root-close')
  }

  /**
   * Closes (not removes) either a directory or a file.
   * @param {String} evt The event name
   * @param  {Object} arg The hash of a root directory or file.
   */
  async run (evt, arg) {
    let root = this._app.getFileSystem().find(arg)
    if (!root) {
      console.log(`No root for arg ${arg} found. Cannot close.`)
      return false
    }

    // Run the close file command in case we're going to close an open root file
    if (this._app.getFileSystem().getOpenFiles().includes(root.hash)) {
      let res = await this._app.runCommand('file-close', { 'hash': root.hash })
      if (!res) {
        global.log.info(`Could not unload root file ${root.name}: Could not close it.`)
        return false
      }
    }

    // We got a root, so now we need to unload it and remove it from config
    try {
      this._app.getFileSystem().unloadPath(root)
      global.config.removePath(root.path)
      // We do not need to update the renderer, will be done automatically.
    } catch (e) {
      global.log.error('Could not unload root!', e)
    }
    return true
  }
}

module.exports = RootClose
