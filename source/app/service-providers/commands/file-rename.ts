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
import { hasMdOrCodeExt } from '@providers/fsal/util/is-md-or-code-file'

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
    // We need to prepare the name to be correct for
    // accurate checking whether or not the file
    // already exists
    let newName = sanitize(arg.name, { replacement: '-' })

    if (newName === '') {
      this._app.windows.prompt('Cannot rename file: No valid characters')
      return
    }

    // If no valid filename extension is provided, assume .md
    if (!hasMdOrCodeExt(newName)) {
      newName += '.md'
    }

    const file = this._app.workspaces.findFile(arg.path)
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
    const pathsEqualCaseInsensitive = file.path.toLowerCase() === newPath.toLowerCase()

    // Test if we are about to override a file. In the case that the user only
    // wants to change the capitalization of a file (e.g., testfile -> Testfile)
    // then case-insensitive file systems (including Windows & macOS) will
    // report that testfile === Testfile, which means that `pathExists` will
    // return true. That's where the second check comes in: If the OS reports
    // that the new path already exists, BUT if we compare it case-insensitive
    // it's the same, then we know that newPath is essentially oldPath, and we
    // should not ask the user for overwriting, as this is literally the file
    // we want to rename. See #5460
    if (await this._app.fsal.pathExists(newPath) && !pathsEqualCaseInsensitive) {
      // Ask for override
      if (!await this._app.windows.shouldOverwriteFile(newName)) {
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
      const { openPaths } = this._app.config.getConfig()
      const isRoot = openPaths.includes(file.path)

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
    } catch (e: any) {
      this._app.log.error(`Error during renaming file: ${e.message as string}`, e)
    }
  }
}
