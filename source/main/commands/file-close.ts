/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FileClose command
 * CVM-Role:        <none>
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This command closes one of the open files.
 *
 * END HEADER
 */

import ZettlrCommand from './zettlr-command'

export default class FileClose extends ZettlrCommand {
  constructor (app: any) {
    super(app, [ 'file-close', 'file-close-all' ])
  }

  /**
   * Close an open file
   * @param {String} evt The event name
   * @param  {Object} arg An object containing a hash of the file to close.
   * @return {boolean}     True, if the file was successfully closed
   */
  async run (evt: string, arg: any): Promise<boolean> {
    if (evt === 'file-close-all') {
      // The renderer wants to close not just one, but all open files
      this._app.getDocumentManager().closeAllFiles()
      this._app.getDocumentManager().activeFile = null
      return true
    }

    // Close one specific file
    try {
      const file = this._app.getDocumentManager().openFiles.find(elem => elem.path === arg)
      if (file === undefined) {
        return false
      }

      // Now check if we can safely close the file
      if (file.modified) {
        const result = await this._app.askSaveChanges()
        // 0 = 'Close without saving changes',
        // 1 = 'Save changes'
        if (result.response === 0) {
          // Clear the modification flag
          this._app.getDocumentManager().markClean(file)
          // Mark the whole application as clean if applicable
          this._app.setModified(!this._app.getDocumentManager().isClean())
        } else {
          // Don't close the file
          global.log.info('[Command] Not closing file, as the user did not want that.')
          return false
        }
      }

      // If we're here the user really wants to close the file.
      // Get the index of the next open file so that we can switch the active one.
      const openFiles = this._app.getDocumentManager().openFiles
      const currentIdx = openFiles.indexOf(file)

      if (this._app.getDocumentManager().activeFile === file && openFiles.length > 1) {
        if (currentIdx === 0) {
          const nextFile = openFiles[currentIdx + 1]
          this._app.getDocumentManager().activeFile = (nextFile === null) ? null : nextFile
        } else {
          const prevFile = openFiles[currentIdx - 1]
          this._app.getDocumentManager().activeFile = (prevFile === null) ? null : prevFile
        }
      }

      if (!this._app.getDocumentManager().closeFile(file)) {
        throw new Error('Could not close file!')
      }

      return true
    } catch (e) {
      global.log.error(e.message, e)
      return false
    }
  }
}
