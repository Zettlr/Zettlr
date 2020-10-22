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

const path = require('path')
const ZettlrCommand = require('./zettlr-command')
const sanitize = require('sanitize-filename')
const isFile = require('../../common/util/is-file')
const ALLOWED_FILETYPES = require('../../common/data.json').filetypes

class FileRename extends ZettlrCommand {
  constructor (app) {
    super(app, 'file-rename')
  }

  /**
   * Rename a file
   * @param {string} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt, arg) {
    // { 'hash': hash, 'name': val }

    // We need to prepare the name to be correct for
    // accurate checking whether or not the file
    // already exists
    let newName = sanitize(arg.name, { replacement: '-' })

    // If no valid filename is provided, assume .md
    let ext = path.extname(newName).toLowerCase()
    if (!ALLOWED_FILETYPES.includes(ext)) {
      newName += '.md'
    }

    let file = this._app.findFile(arg.hash)
    if (file === null) {
      return global.log.error(`Could not find file ${arg.hash}`)
    }

    // Test if we are about to override a file
    if (isFile(path.join(file.dir, newName))) {
      // Ask for override
      let result = await this._app.getWindow().askOverwriteFile(newName)
      if (result.response === 0) return // No override wanted
    }

    try {
      await this._app.getFileSystem().renameFile(file, newName)
    } catch (e) {
      global.log.error('Error during renaming file: ' + e.message, e)
    }
    return true
  }
}

module.exports = FileRename
