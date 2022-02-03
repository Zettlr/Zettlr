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
    * Force-Opens a file, after click on internal link
    * @param {String} evt The event name
    * @param  {Object} payload the parameters of the file to be opened
    * @return {Boolean} Whether the file was successfully opened.
    */
  async run (evt: string, payload: any): Promise<void> {
    const { linkContents, newTab } = payload

    // Determine if the file should be created, if it can't be found. For this
    // we need both the respective preferences setting and an auto-search
    // command.
    const autoCreate: boolean = global.config.get('zkn.autoCreateLinkedFiles')
    const customDir: string = global.config.get('zkn.customDirectory')

    const idRE = getIDRE(true)
    let file = null

    // First, let's see if what we got looks like an ID, or not. If it looks
    // like an ID, attempt to match it that way, else try to search for a
    // filename.
    if (idRE.test(linkContents)) {
      // It's an ID
      file = this._app.getFileSystem().findExact(linkContents, 'id')
    } else {
      // It's a filename -- now check if an extension is given (likely not)
      if (FILETYPES.includes(path.extname(linkContents))) {
        // file ending given
        file = this._app.getFileSystem().findExact(linkContents, 'name')
      } else {
        // No file ending given, so let's test all allowed. The filetypes are
        // sorted by probability (first .md, then .markdown), to reduce the
        // amount of time spent on the tree.
        for (const type of FILETYPES) {
          file = this._app.getFileSystem().findExact((linkContents as string) + type, 'name')
          if (file !== null) {
            break
          }
        }
      }
    }

    // Now we have a file (if not, create a new one if the user wishes so)
    if (file != null) {
      await this._app.getDocumentManager().openFile(file.path, newTab)
    } else if (autoCreate && customDir !== '') {
      // Call the file-new command on the application, which'll do all
      // necessary steps for us.
      await this._app.runCommand('file-new', { name: linkContents, path: customDir })
    } else if (autoCreate && customDir === '') {
      await this._app.runCommand('file-new', { name: linkContents })
    }
  }
}

module.exports = ForceOpen
