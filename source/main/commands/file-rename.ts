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

import path from 'path'
import ZettlrCommand from './zettlr-command'
import sanitize from 'sanitize-filename'
import isFile from '../../common/util/is-file'
import { filetypes as ALLOWED_FILETYPES } from '../../common/data.json'

export default class FileRename extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-rename')
  }

  /**
   * Rename a file
   * @param {string} evt The event name
   * @param  {Object} arg An object containing hash of containing and name of new dir.
   */
  async run (evt: string, arg: any): Promise<void> {
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
      return global.log.error(`Could not find file ${String(arg.hash)}`)
    }

    // Test if we are about to override a file
    if (isFile(path.join(file.dir, newName))) {
      // Ask for override
      if (await this._app.askOverwriteFile(newName)) {
        return // No override wanted
      }
    }

    try {
      await this._app.getFileSystem().renameFile(file, newName)
    } catch (e) {
      global.log.error(`Error during renaming file: ${e.message as string}`, e)
    }
  }
}
