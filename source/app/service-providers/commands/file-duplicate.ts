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
import { trans } from '@common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'
import { codeFileExtensions, mdFileExtensions } from '@providers/fsal/util/valid-file-extensions'
import isFile from '@common/util/is-file'

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
    let file = this._app.fsal.findFile(arg.path)
    if (file === null) {
      this._app.log.error('Could not duplicate source file, because the source file was not found')
      this._app.windows.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'Could not duplicate file, because the source file was not found'
      })
      return
    }

    // Then, the target directory.
    let dir = file.parent // (1) A specified directory
    if (dir === null) {
      dir = this._app.fsal.openDirectory // (2) The current dir
    }

    if (dir === null) { // (3) Fail
      this._app.log.error('Could not create file, because no directory was found')
      this._app.windows.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: 'No directory provided'
      })
      return
    }

    let filename = ''
    if (arg.name !== undefined) {
      // We have a user-provided filename
      filename = sanitize(arg.name.trim(), { 'replacement': '-' })
    } else {
      // We need to generate our own filename. First, attempt to just use 'copy of'
      filename = 'Copy of ' + file.name // TODO: Translate
      // See if it's a file
      if (isFile(path.join(dir.path, filename))) {
        // Filename is already given, so we need to add increasing numbers
        let duplicateNumber = 1
        while (isFile(path.join(dir.path, `Copy (${duplicateNumber}) of ${file.name}`))) {
          duplicateNumber++
        }
        // Now we have a unique filename
        filename = `Copy (${duplicateNumber}) of ${file.name}`
      }
    }

    // Afterwards, make sure the name is correct.
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
    const fileMeta = await this._app.fsal.getFileContents(file)
    await this._app.fsal.createFile(dir, {
      name: filename,
      content: fileMeta.content
    })

    // And directly thereafter, open the file
    await this._app.documents.openFile(path.join(dir.path, filename))
  }
}
