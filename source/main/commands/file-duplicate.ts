/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileDuplicate command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command duplicates a file.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'
import { trans } from '../../common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'
import { codeFileExtensions, mdFileExtensions } from '../../common/get-file-extensions'

const CODEFILE_TYPES = codeFileExtensions(true)
const ALLOWED_FILETYPES = mdFileExtensions(true)

export default class FileDuplicate extends ZettlrCommand {
  constructor (app: any) {
    super(app, 'file-duplicate')
  }

  /**
   * Duplicate a file.
   * @param  {String} evt The event name
   * @param  {Object} arg An object containing all necessary information.
   * @return {void}     This function does not return anything.
   */
  async run (evt: string, arg: any): Promise<void> {
    // ARG structure: { dir, file, name }

    // First, retrieve our source file
    let file = this._app.findFile(arg.path)
    if (file === null) {
      global.log.error('Could not duplicate source file, because the source file was not found')
      this._app.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'Could not duplicate file, because the source file was not found'
      })
      return
    }

    // Then, the target directory.
    let dir = file.parent // (1) A specified directory
    if (dir === null) {
      dir = this._app.getFileSystem().openDirectory // (2) The current dir
    }

    if (dir === null) { // (3) Fail
      global.log.error('Could not create file, because no directory was found')
      this._app.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'No directory provided'
      })
      return
    }

    // Afterwards, make sure the name is correct.
    let filename = (arg.name !== undefined) ? sanitize(arg.name.trim(), { 'replacement': '-' }) : 'Copy of ' + file.name // TODO: Translate
    if (filename === '') {
      throw new Error('Could not create file: Filename was not valid')
    }

    // If no valid filename is provided, assume the original file's extension
    const newFileExtname = path.extname(filename).toLowerCase()
    if (file.type === 'file' && !ALLOWED_FILETYPES.includes(newFileExtname)) {
      filename += file.ext // Assume the original file's extension
    } else if (file.type === 'code' && !CODEFILE_TYPES.includes(newFileExtname)) {
      filename += file.ext // Assume the original file's extension
    }

    // Retrieve the file's content and create a new file with the same content
    const fileMeta = await this._app.getFileSystem().getFileContents(file)
    await this._app.getFileSystem().createFile(dir, {
      name: filename,
      content: fileMeta.content
    })

    // And directly thereafter, open the file
    await this._app.getDocumentManager().openFile(path.join(dir.path, filename))
  }
}

module.exports = FileDuplicate
