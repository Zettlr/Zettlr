/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileRename command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command renames a file.
 *
 * END HEADER
 */

const GettlrCommand = require('./Gettlr-command')
const ignoreFile = require('../../common/util/ignore-file')
const sanitize = require('sanitize-filename')

class FileRename extends GettlrCommand {
  constructor (app) {
    super(app, 'file-rename')
  }

  /**
   * Rename a directory
   * @param {String} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt, arg) {
    // { 'hash': hash, 'name': val }
    let oldpath = ''

    // We need to prepare the name to be correct for
    // accurate checking whether or not the file
    // already exists
    arg.name = sanitize(arg.name, { replacement: '-' })
    // Make sure we got an extension.
    if (ignoreFile(arg.name)) arg.name += '.md'

    let file = this._app.findFile({ 'hash': parseInt(arg.hash) })
    if (!file) return global.log.error(`Could not find file ${arg.hash}`)

    oldpath = file.path
    if (file.parent.hasChild({ 'name': arg.name })) {
      // hasChild will look for the property "name". But as it
      // will look for "hash" first, we need to extract it
      let res = await this._app.getWindow().askOverwriteFile(arg.name)
      if (res.response === 0) return // Don't overwrite; abort
    }

    file.rename(arg.name) // Done.

    // A root has been renamed -> replace the old path with the new one.
    if (file.isRoot()) {
      let oP = global.config.get('openPaths')
      for (let i = 0; i < oP.length; i++) {
        if (oP[i] === oldpath) {
          oP[i] = file.path
          global.config.set('openPaths', oP)
          break
        }
      }
    }

    // Make sure the directory knows what has been changed
    await file.parent.scan()

    // Replace all relevant properties of the renamed file in renderer.
    global.application.fileUpdate(arg.hash, file.getMetadata())
    // Remember to also update the directory to apply the potential new sorting!
    global.application.dirUpdate(file.parent.hash, file.parent.getMetadata())

    if (file === this._app.getCurrentFile()) {
      // Also "re-set" the current file to trigger some additional
      // actions necessary to reflect the changes throughout the app.
      this._app.setCurrentFile(this._app.getCurrentFile())
      // Adapt window title (manually trigger a fileUpdate)
      this._app.window.fileUpdate()
    }
  }
}

module.exports = FileRename
