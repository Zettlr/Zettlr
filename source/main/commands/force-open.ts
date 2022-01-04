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

import path from 'path'
import ZettlrCommand from './zettlr-command'
import { getIDRE } from '@common/regular-expressions'
import { mdFileExtensions } from '@common/get-file-extensions'

const FILETYPES = mdFileExtensions(true)

export default class ForceOpen extends ZettlrCommand {
  constructor (app: any) {
    super(app, ['force-open'])
  }

  /**
    * Removes a file.
    * @param {String} evt The event name
    * @param  {Object} arg the parameters of the file to be deleted
    * @return {Boolean} Whether the file was successfully deleted.
    */
  async run (evt: string, arg: any): Promise<void> {
    // Determine if the file should be created, if it can't be found. For this
    // we need both the respective preferences setting and an auto-search
    // command.
    const autoCreate = Boolean(global.config.get('zkn.autoCreateLinkedFiles'))

    const idRE = getIDRE(true)
    let file = null

    // First, let's see if what we got looks like an ID, or not. If it looks
    // like an ID, attempt to match it that way, else try to search for a
    // filename.
    if (idRE.test(arg)) {
      // It's an ID
      file = this._app.getFileSystem().findExact(arg, 'id')
    } else {
      // It's a filename -- now check if an extension is given (likely not)
      if (FILETYPES.includes(path.extname(arg))) {
        // file ending given
        file = this._app.getFileSystem().findExact(arg, 'name')
      } else {
        // No file ending given, so let's test all allowed. The filetypes are
        // sorted by probability (first .md, then .markdown), to reduce the
        // amount of time spent on the tree.
        for (const type of FILETYPES) {
          file = this._app.getFileSystem().findExact((arg as string) + type, 'name')
          if (file !== null) {
            break
          }
        }
      }
    }

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file != null) {
      await this._app.getDocumentManager().openFile(file.path)
    } else if (autoCreate) {
      // Call the file-new command on the application, which'll do all
      // necessary steps for us.
      await this._app.runCommand('file-new', { name: arg })
    }
  }
}

module.exports = ForceOpen
