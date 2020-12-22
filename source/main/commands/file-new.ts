/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileNew command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command creates a new file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '../../common/i18n'
import hash from '../../common/util/hash'
import path from 'path'
import sanitize from 'sanitize-filename'
import { filetypes as ALLOWED_FILETYPES } from '../../common/data.json'

export default class FileNew extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-new')
  }

  /**
   * Create a new file.
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of containing directory and a file name.
   * @return {void}     This function does not return anything.
   */
  async run (evt: string, arg: any): Promise<void> {
    let dir = null

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('hash')) {
      dir = this._app.getFileSystem().findDir(arg.hash)
    } else {
      global.log.warning('No directory selected. Using currently selected directory ...')
      dir = this._app.getCurrentDir()
    }

    if (dir === null) {
      global.log.error(`Could not create new file ${arg.name as string}: No directory selected!`)
      return
    }

    try {
      // Then, make sure the name is correct.
      let filename = sanitize(arg.name, { 'replacement': '-' })
      if (filename.trim() === '') {
        throw new Error('Could not create file: Filename was not valid')
      }

      // If no valid filename is provided, assume .md
      let ext = path.extname(filename).toLowerCase()
      if (!ALLOWED_FILETYPES.includes(ext)) {
        filename += '.md'
      }

      // Check if there's already a file with this name in the directory
      // NOTE: There are case-sensitive file systems, but we'll disallow this
      let found = dir.children.find(e => e.name.toLowerCase() === filename.toLowerCase())
      if (found !== undefined) {
        // Ask before overwriting
        if (await this._app.askOverwriteFile(filename)) {
          return
        }
      }

      // First create the file
      await this._app.getFileSystem().createFile(dir, {
        name: filename,
        content: ''
      })

      // And directly thereafter, open the file
      let fileHash = hash(path.join(dir.path, filename))
      await this._app.openFile(fileHash)
    } catch (e) {
      global.log.error(`Could not create file: ${e.message as string}`)
      this._app.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: e.message
      })
    }
  }
}
