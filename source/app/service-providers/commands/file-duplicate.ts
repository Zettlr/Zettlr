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
import { hasCodeExt, hasMarkdownExt } from '@common/util/file-extention-checks'
import type { AppServiceContainer } from 'source/app/app-service-container'

export default class FileDuplicate extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'file-duplicate')
  }

  /**
   * Duplicate a file.
   * @param  {String} evt The event name
   * @param  {Object} arg An object containing all necessary information.
   * @return {void}     This function does not return anything.
   */
  async run (evt: string, arg: any): Promise<void> {
    // First, retrieve our source file
    let file = this._app.workspaces.findFile(arg.path)
    if (file === undefined) {
      this._app.log.error('Could not duplicate source file, because the source file was not found')
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create file'),
        message: 'Could not duplicate file, because the source file was not found'
      })
      return
    }

    // Then, the target directory.
    let dir = this._app.workspaces.findDir(file.dir) // (1) A specified directory
    const { openDirectory } = this._app.config.get()
    if (dir === undefined && openDirectory !== null && await this._app.fsal.isDir(openDirectory)) {
      dir = await this._app.fsal.getAnyDirectoryDescriptor(openDirectory)
    }

    if (dir === undefined) { // (3) Fail
      this._app.log.error('Could not create file, because no directory was found')
      this._app.windows.prompt({
        type: 'error',
        title: trans('Could not create file'),
        message: 'No directory provided'
      })
      return
    }

    let filename = ''
    if (arg.name !== undefined) {
      // We have a user-provided filename
      filename = sanitize(arg.name.trim(), { replacement: '-' })
    } else {
      // We need to generate our own filename. First, attempt to just use 'copy of'
      filename = trans('Copy of %s', file.name)
      // See if it's a file
      if (await this._app.fsal.isFile(path.join(dir.path, filename))) {
        // Filename is already given, so we need to add increasing numbers
        let duplicateNumber = 1
        while (await this._app.fsal.isFile(path.join(dir.path, `Copy (${duplicateNumber}) of ${file.name}`))) {
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
    if (file.type === 'file' && !hasMarkdownExt(filename)) {
      filename += file.ext // Assume the original file's extension
    } else if (file.type === 'code' && !hasCodeExt(filename)) {
      filename += file.ext // Assume the original file's extension
    }

    // Retrieve the file's content and create a new file with the same content
    const contents = await this._app.fsal.loadAnySupportedFile(file.path)
    await this._app.fsal.writeTextFile(path.join(dir.path, filename), contents)

    // And directly thereafter, open the file
    await this._app.documents.openFile(arg.windowNumber, arg.leafId, path.join(dir.path, filename))
  }
}
