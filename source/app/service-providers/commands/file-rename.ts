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
import { dialog } from 'electron'
import { trans } from '@common/i18n-main'
import replaceLinks from '@common/util/replace-links'
import { hasAnyRecognizedFileExtension } from '@common/util/file-extention-checks'
import type { AppServiceContainer } from 'source/app/app-service-container'
import pathExists from 'source/common/util/path-exists'

export default class FileRename extends ZettlrCommand {
  constructor (app: AppServiceContainer) {
    super(app, 'file-rename')
  }

  /**
   * Rename a file
   *
   * @param  {string}  evt  The event name
   * @param  {any}     arg  An object containing hash of containing and name of new dir.
   */
  async run (evt: string, arg: { path: string, name: string }): Promise<void> {
    // We need to prepare the name to be correct for
    // accurate checking whether or not the file
    // already exists
    let newName = sanitize(arg.name, { replacement: '-' })

    if (newName === '') {
      this._app.windows.prompt('Cannot rename file: No valid characters')
      return
    }

    let oldExt = path.extname(arg.path)
    let newExt = path.extname(newName)

    // If no new extension was provided, assume it was a rename targeting the
    // old extension. If the extensions are not the same, show a dialogue asking
    // the user to confirm  if they would like to change the file extension.
    // If they respond with `Keep`, the file is still renamed, but the new
    // extension is replaced with the old one.
    if (newExt !== '' && oldExt !== newExt) {
      const response = await dialog.showMessageBox({
        title: trans('Confirm'),
        message: trans('Change file extension from %s to %s?', oldExt, newExt),
        buttons: [
          trans('Use %s', newExt),
          trans('Keep %s', oldExt),
        ],
        defaultId: 1
      })

      // If `Keep`, replace the new extension with the old one.
      if (response.response === 1) {
        let newExtPos = newName.lastIndexOf(newExt)

        newName = newName.slice(0, newExtPos) + oldExt
        newExt = oldExt
      }
    }

    const invalidExt = !hasAnyRecognizedFileExtension(newName, this._app.config.get().attachmentExtensions)

    // If the old and new file extensions do not match (they were changed),
    // and the new name does not have a recognized extension, add the old
    // extension, or if one was not found, default to `.md`
    if (oldExt !== newExt && invalidExt) {
      newName += (oldExt !== '' ? oldExt : '.md')
    }

    const file = await this._app.fsal.getDescriptorForAnySupportedFile(arg.path)
    if (file === undefined) {
      return this._app.log.error(`Could not find file ${String(arg.path)}`)
    }

    if (this._app.documents.isModified(file.path)) {
      // Make sure to not rename a file if it contains unsaved changes. People who
      // have autosave activated are pretty likely to never see this message box
      // either way.
      this._app.windows.prompt('Cannot rename file: Please save your changes first.')
      return
    }

    // If the new name equals the old one, don't do anything, see #1942
    if (file.name === newName) {
      this._app.log.info(`[App] Didn't rename file to ${newName} since it's the same name`)
      return
    }

    const newPath = path.join(file.dir, newName)

    // Now, we have to ensure we are not accidentally overriding a file by
    // renaming this one. Take note of issues #5460 (do not ask if changing a
    // file's capitalization) and #4940 (do not overwrite other files). The
    // primary complicating factor is that we can't rely on `pathExists` (it may
    // lie), since many file systems nowadays are case-insensitive case-
    // preserving. This means you can have a file `testfile.md` and rename it to
    // `TESTFILE.md`, but the file system will say that `TESTFILE.md` already
    // exists because ( `testfile.md === TESTFILE.md`).
    // Thus, we need to check two conditions: Whether the user has requested a
    // case change only, and whethere there is a DIFFERENT file at that new
    // place.
    const caseChangeOnly = newName.toLowerCase() === file.name.toLowerCase()

    if (await this._app.fsal.pathExists(newPath)) {
      // The file system reports the newPath already exists.
      if (caseChangeOnly && await pathExists(newPath)) {
        // The user only changed the case. Based on the second check, it appears
        // that this file system is case-insensitive, which means that the
        // reason `pathExists()` has returned true is because it confirms the
        // existence of this very file. So no need to ask the user. I keep this
        // empty if-case because reversing it would make it less comprehensible.
      } else if (!await this._app.windows.shouldOverwriteFile(newName)) {
        // In any other case (full rename or case-sensitive file system), ask.
        return // No override wanted
      } else {
        // Remove the file to be overwritten prior
        await this._app.fsal.removeFile(newPath)
      }
    }

    try {
      // We need to retrieve the inboundLinks before we rename the file, since
      // afterwards the links won't be valid anymore.
      const oldName = file.name
      const inboundLinks = this._app.links.retrieveInbound(file.path)

      // Before renaming the file, let's see if it is a root file. Because if it
      // is, we have to close it first.
      const { openFiles } = this._app.config.getConfig().app
      const isRoot = openFiles.includes(file.path)

      if (isRoot) {
        this._app.config.removePath(file.path)
      }

      // Now, rename the file.
      await this._app.fsal.rename(file.path, newPath)
      // Notify the documents provider so it can exchange any files if necessary
      await this._app.documents.hasMovedFile(file.path, newPath)

      if (isRoot) {
        this._app.config.addPath(newPath)
      }

      // Finally, let's check if we can update some internal links to that file.
      if (inboundLinks.length > 0) {
        const response = await dialog.showMessageBox({
          title: trans('Confirm'),
          message: trans('Update %s internal links to file %s?', inboundLinks.length, newName),
          buttons: [
            trans('Yes'),
            trans('No')
          ],
          defaultId: 1
        })

        if (response.response === 1) {
          return // Do not update the links.
        }

        // So ... update. We'll basically take the rename-tag command as a template.
        for (const file of inboundLinks) {
          const content = await this._app.fsal.readTextFile(file)
          const newContent = replaceLinks(content, oldName, newName)
          if (newContent !== content) {
            await this._app.fsal.writeTextFile(file, newContent)
            this._app.log.info(`[Application] Replaced link to ${oldName} with ${newName} in file ${file}`)
          }
        }
      }
    } catch (err: unknown) {
      if (err instanceof Error) {
        this._app.log.error(`Error during renaming file: ${err.message as string}`, err)
      }
    }
  }
}
