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
import { trans } from '@common/i18n-main'
import path from 'path'
import sanitize from 'sanitize-filename'
import generateFilename from '@common/util/generate-filename'
import { app } from 'electron'
import { getExtensionForDocumentType, hasAnyRecognizedFileExtension } from '@common/util/file-extention-checks'
import type { AppServiceContainer } from 'source/app/app-service-container'
import type { DocumentType } from '@dts/common/documents'

export default class FileNew extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, ['file-new'])
  }

  /**
   * Create a new file.
   * @param  {String} evt   The event name
   * @param  {Object} arg   An object containing information about the file to create.
   * @return {void}         This function does not return anything.
   */
  async run (evt: string, arg: { leafId?: string, windowId?: string, name?: string, path?: string, type?: DocumentType }): Promise<void> {
    // A few notes on how this command works with respect to its input. As you
    // can see, all parameters are optional and all which are missing will be
    // inferred from context (otherwise the command will fail). The type
    // defaults to Markdown, obviously, the path to the current directory and
    // the name has the following function: If it is given, the user will not
    // be asked for a filename, but if it's missing, a new name will be
    // generated and the user is asked to confirm the name.
    const { newFileDontPrompt, newFileNamePattern, openDirectory, attachmentExtensions, zkn } = this._app.config.get()

    const generatedName = generateFilename(newFileNamePattern, zkn.idGen)

    const leafId = arg.leafId

    if (arg.windowId === undefined) {
      // The caller didn't provide a window number. This can happen with, e.g.
      // menu items. But since we want to fulfill the user's wish, we first try
      // to fallback onto any main window and only fail otherwise.
      const firstMainWindow = this._app.windows.getFirstMainWindow()
      if (firstMainWindow !== undefined) {
        arg.windowId = this._app.windows.getMainWindowKey(firstMainWindow)
      }
    }

    const windowId = arg.windowId

    if (windowId === undefined) {
      this._app.log.error('Cannot create new file: No window id provided')
      return
    }

    // Assume there is no directory we could salvage, so choose the documents
    // directory, but (by setting isFallbackDir to true) allow the user to
    // change it.
    let dirpath = app.getPath('documents')
    let isFallbackDir = true
    if (typeof arg.path === 'string' && await this._app.fsal.isDir(arg.path)) {
      // Explicitly provided directory
      dirpath = arg.path
      isFallbackDir = false
    } else if (openDirectory !== null && await this._app.fsal.isDir(openDirectory)) {
      // Choose the openDirectory
      dirpath = openDirectory
      isFallbackDir = false
    }

    // Make sure we have a filename and have the user confirm this if applicable
    // Also, if the user does not want to be prompted BUT we had to use the
    // fallback directory, we should also prompt the user as otherwise it would
    // be opaque to the user where the notes end up in.
    if (
      // No name provided, but the user does not want an auto-generated name
      (arg.name === undefined && !newFileDontPrompt) ||
      // The user does not wish to provide a filename, but we've had to revert
      // to a fallback directory
      (newFileDontPrompt && isFallbackDir)
    ) {
      // The user wishes/needs to confirm the filename and/or the directory
      const chosenPath = await this._app.windows.saveFile(path.join(dirpath, generatedName))
      if (chosenPath === undefined) {
        this._app.log.info('Did not create new file since the dialog was aborted.')
        return
      }

      arg.name = path.basename(chosenPath)
      // The user may also have selected a different directory altogether. If
      // that directory exists and is loaded by the FSAL, overwrite the dir.
      if (path.dirname(chosenPath) !== dirpath) {
        dirpath = path.dirname(chosenPath)
      }
    } else if (arg.name === undefined) {
      // Just generate a name.
      arg.name = generatedName
    }

    try {
      // Then, make sure the name is correct.
      let filename = sanitize(arg.name.trim(), { replacement: '-' })
      if (filename === '') {
        throw new Error('Could not create file: Filename was not valid')
      }

      const ext = path.extname(filename)
      const extType = arg.type !== undefined ? getExtensionForDocumentType(arg.type) : '.md'
      const invalidExt = !hasAnyRecognizedFileExtension(filename, attachmentExtensions)

      // If a type was provided, but the actual and expected extensions do not
      // match, or if the new extension is not recognized, set the extension to
      // the expected one, defaulting to `.md`
      if ((arg.type !== undefined && ext !== extType) || invalidExt) {
        filename += extType
      }

      const absPath = path.join(dirpath, filename)

      // Check if there's already a file with this name in the directory
      // NOTE: There are case-sensitive file systems, but we'll disallow this
      if (await this._app.fsal.pathExists(absPath)) {
        // Ask before overwriting
        if (!await this._app.windows.shouldOverwriteFile(filename)) {
          return
        } else {
          // Remove the file before creating it anew. We'll use the
          // corresponding command for that.
          this._app.documents.closeFileEverywhere(absPath)
          await this._app.fsal.removeFile(absPath)
        }
      }

      // First create the file
      await this._app.fsal.writeTextFile(absPath, '')

      // And directly thereafter, open the file
      await this._app.documents.openFile(windowId, leafId, absPath, true)
      // Final check: If the file has been created outside of any loaded
      // workspace, we must add it as root so that some other functions of
      // Zettlr work fine (even though the editing should work flawlessly.).
      // Since at this point the events that add the file to the tree likely
      // haven't fired yet, we can check whether the parent directory exists.
      if ((await this._app.fsal.getAnyDirectoryDescriptor(path.dirname(absPath))) === undefined) {
        this._app.config.addPath(absPath)
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this._app.log.error(`Could not create file: ${err.message as string}`)
        this._app.windows.prompt({
          type: 'error',
          title: trans('Could not create file'),
          message: err.message
        })
      }
    }
  }
}
