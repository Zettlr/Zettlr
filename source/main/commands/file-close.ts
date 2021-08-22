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

import broadcastIpcMessage from '../../common/util/broadcast-ipc-message'
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
        } else if (result.response === 1) {
          // The following code looks horrible, but it solves the problem quite
          // elegantly: Since we are in an asynchronous function, we can actually
          // pause execution of this function until the file has been saved. To
          // do this, we create a new promise and, inside that, listen to the
          // document-modified-changed event of the document manager, which is
          // being emitted everytime something in the modification status has
          // changed. This happens if a file is being saved. To prevent *other*
          // files from resolving the promise, we will explicitly check if the
          // event has been emitted specifically in response to a successful
          // save of our file here.
          await new Promise<void>((resolve, reject) => {
            const callback = (): void => {
              // The document manager has access to the same object, so just wait
              // until the document manager sets the file.modified flag to false.
              if (!file.modified) {
                // Always remember to clean up 🧹
                this._app.getDocumentManager().off('document-modified-changed', callback)
                resolve()
              }
            }
            this._app.getDocumentManager().on('document-modified-changed', callback)

            // Tell the renderer to actually save our file.
            broadcastIpcMessage('save-documents', [file.path])

            // Failsafe: Reject if the file in question hasn't been saved after
            // 5 seconds. Even the slowest of computers should be able to save a
            // plain text file in that amount of time.
            setTimeout(() => { reject(new Error(`[Application] Could not automatically save file ${file.path}`)) }, 5000)
          })
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
