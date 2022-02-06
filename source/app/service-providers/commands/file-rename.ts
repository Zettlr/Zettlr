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
    if (file === null) {
      return this._app.log.error(`Could not find file ${String(arg.path)}`)
    }

    // Find the file within the open documents
    const documentDescriptor = this._app.documents.openFiles.find(e => e.path === file.path)
    if (documentDescriptor?.modified === true) {
      // Make sure to not rename a file if it contains unsaved changes. People who
      // have autosave activated are pretty likely to never see this message box
      // either way.
      this._app.windows.prompt('Cannot rename file: Please save your changes first.')
      return
    }

    // If the new name equals the old one, don't do anything, see #1942
    if (file.name.toLowerCase() === newName.toLowerCase()) {
      this._app.log.info(`[App] Didn't rename file to ${newName} since it's the same name`)
      return
    }

    // Test if we are about to override a file
    const dir = file.parent
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

    // Check if the file was currently open. Since only the FSAL will get the
    // info, we should close immediately, in order to prevent a "zombie" file
    // to remain open in the document manager.
    const wasActive = this._app.documents.activeFile?.path === file.path
    const wasOpen = documentDescriptor !== undefined
    if (documentDescriptor !== undefined) {
      const result = await this._app.commands.run('file-close', documentDescriptor.path)
      if (result === false) {
        this._app.log.warning(`[FileRename] Not renaming ${documentDescriptor.path}.`)
        return
      }
    }

    try {
      await this._app.fsal.renameFile(file, newName)
      // NOTE: At this point, `file` will contain the _new_ information which
      // we can now use to re-set the documentManager's state if need be.
      if (wasOpen) {
        // NOTE: We must open in a new tab regardless of setting, since in this
        // case we have programmatically closed the file
        await this._app.documents.openFile(file.path, true)
      }
      if (wasActive) {
        this._app.documents.activeFile = file
      }
    } catch (e: any) {
      this._app.log.error(`Error during renaming file: ${e.message as string}`, e)
    }
  }
}
