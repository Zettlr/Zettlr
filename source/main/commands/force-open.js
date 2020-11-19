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
const { getIDRE } = require('../../common/regular-expressions')
const FILETYPES = require('../../common/data.json').filetypes

class ForceOpen extends ZettlrCommand {
  constructor (app) {
    super(app, [ 'force-open', 'force-open-if-exists' ])
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt, arg) {
    // Determine if the file should be created, if it can't be found. For this
    // we need both the respective preferences setting and an auto-search
    // command.
    let autoCreate = global.config.get('zkn.autoCreateLinkedFiles') && evt === 'force-open'

    const idRE = getIDRE()
    let file = null

    // First, let's see if what we got looks like an ID, or not. If it looks
    // like an ID, attempt to match it that way, else try to search for a
    // filename.
    if (idRE.test(arg)) {
      // It's an ID
      file = this._app.getFileSystem().findExact(arg, 'id')
    } else {
      // It's a filename -- now check if an extension is given (likely not)
      if (path.extname(arg).length > 1) {
        // file ending given
        file = this._app.getFileSystem().findExact(arg, 'name')
      } else {
        // No file ending given, so let's test all allowed. The filetypes are
        // sorted by probability (first .md, then .markdown), to reduce the
        // amount of time spent on the tree.
        for (let type of FILETYPES) {
          file = this._app.getFileSystem().findExact(arg + type, 'name')
          if (file !== null) {
            break
          }
        }
      }
    }

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file != null) {
      // Normally files from main are opened intransient. But not this one.
      global.ipc.send('announce-transient-file', { 'hash': file.hash })
      this._app.openFile(file.hash)
    } else if (autoCreate) {
      // Call the file-new command on the application, which'll do all
      // necessary steps for us.
      await this._app.runCommand('file-new', { 'name': arg })
    }
  }
}

module.exports = ForceOpen
