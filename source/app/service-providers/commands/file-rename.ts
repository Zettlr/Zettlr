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
import { codeFileExtensions, mdFileExtensions } from '@providers/fsal/util/valid-file-extensions'
import { dialog } from 'electron'
import { promises as fs } from 'fs'
import { trans } from '@common/i18n-main'
import replaceLinks from '@common/util/replace-links'

const ALLOWED_FILETYPES = mdFileExtensions(true)
const CODE_FILETYPES = codeFileExtensions(true)

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

    // If no valid filename is provided, assume .md
    let ext = path.extname(newName).toLowerCase()
    if (!ALLOWED_FILETYPES.includes(ext) && !CODE_FILETYPES.includes(ext)) {
      newName += '.md'
    }

    const file = this._app.fsal.findFile(arg.path)
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

    // Test if we are about to override a file
    const dir = this._app.fsal.findDir(file.dir)
    let found = dir?.children.find(e => e.name.toLowerCase() === newName.toLowerCase())
    if (found !== undefined && found.type !== 'directory' && file !== found) {
      // Ask for override
      if (!await this._app.windows.shouldOverwriteFile(newName)) {
        return // No override wanted
      } else {
        // Remove the file to be overwritten prior
        await this._app.fsal.removeFile(found)
      }
    }

    try {
      // We need to retrieve the inboundLinks before we rename the file, since
      // afterwards the links won't be valid anymore.
      const oldName = file.name
      const inboundLinks = this._app.links.retrieveInbound(file.path)

      // Now, rename the file.
      await this._app.fsal.renameFile(file, newName)

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
          const content = await fs.readFile(file, 'utf-8')
          const newContent = replaceLinks(content, oldName, newName)
          if (newContent !== content) {
            await fs.writeFile(file, newContent, 'utf-8')
            this._app.log.info(`[Application] Replaced link to ${oldName} with ${newName} in file ${file}`)
          }
        }
      }
    } catch (e: any) {
      this._app.log.error(`Error during renaming file: ${e.message as string}`, e)
    }
  }
}
