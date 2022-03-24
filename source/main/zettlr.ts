/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Zettlr class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class is the main hub for everything that the main
 *                  process does. This means that here everything the app can
 *                  or cannot do come together.
 *
 * END HEADER
 */

import { CodeFileDescriptor, MDFileDescriptor } from '@dts/main/fsal'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'

import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import extractFilesFromArgv from '../app/util/extract-files-from-argv'
import AppServiceContainer from '../app/app-service-container'

export default class Zettlr {
  editFlag: boolean
  _openPaths: any
  private readonly isShownFor: string[]
  private readonly _app: AppServiceContainer

  /**
    * Create a new application object
    * @param {electron.app} parentApp The app object.
    */
  constructor (_app: AppServiceContainer) {
    this._app = _app
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = [] // Holds all currently opened paths.
    this.isShownFor = [] // Contains all files for which remote notifications are currently shown

    // Now that the config provider is definitely set up, let's see if we
    // should copy the interactive tutorial to the documents directory.
    if (this._app.config.isFirstStart()) {
      this._app.log.info('[First Start] Copying over the interactive tutorial!')
      this._app.commands.run('tutorial-open', {})
        .catch(err => this._app.log.error('[Application] Could not open tutorial', err))
    }

    this._app.windows.on('main-window-closed', () => {
      // Reset the FSAL state history so that any new window will have a clean start
      this._app.fsal.resetFiletreeHistory()
    })

    // Listen to document manager changes
    this._app.documents.on('update', (scope: string, changedDescriptor?: MDFileDescriptor|CodeFileDescriptor) => {
      switch (scope) {
        case 'openFileRemotelyChanged':
          if (changedDescriptor !== undefined) {
            // An open file has been changed --> handle this!
            this._onFileContentsChanged(changedDescriptor)
          }
          break
      }
    })
  }

  /**
   * Callback to perform necessary functions in order to replace file contents.
   *
   * @param {object} info The info object originally passed to the event.
   * @memberof Zettlr
   */
  _onFileContentsChanged (changedFile: MDFileDescriptor|CodeFileDescriptor): void {
    // The contents of one of the open files have changed.
    // What follows looks a bit ugly, welcome to callback hell.
    if (this._app.config.get('alwaysReloadFiles') === true) {
      this._app.documents.getFileContents(changedFile).then((file: MDFileMeta|CodeFileMeta) => {
        broadcastIpcMessage('open-file-changed', file)
      }).catch(e => this._app.log.error(e.message, e))
    } else {
      // Prevent multiple instances of the dialog, just ask once. The logic
      // always retrieves the most recent version either way
      const filePath = changedFile.path
      if (this.isShownFor.includes(filePath)) {
        return
      }
      this.isShownFor.push(filePath)

      // Ask the user if we should replace the file
      this._app.windows.shouldReplaceFile(changedFile.name)
        .then((shouldReplace) => {
          // In any case remove the isShownFor for this file.
          this.isShownFor.splice(this.isShownFor.indexOf(filePath), 1)
          if (!shouldReplace) {
            return
          }

          if (changedFile === null) {
            this._app.log.error('[Application] Cannot replace file.', changedFile)
            return
          }

          this._app.documents.getFileContents(changedFile).then((file: any) => {
            broadcastIpcMessage('open-file-changed', file)
          }).catch(e => this._app.log.error(e.message, e))
        }).catch(e => this._app.log.error(e.message, e)) // END ask replace file
    }
  }

  /**
   * Initiate the main process logic after boot.
   */
  async init (): Promise<void> {
    // Open any new files we have in the process arguments.
    await this._app.commands.run('roots-add', extractFilesFromArgv())
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {Promise} Resolves after the providers have shut down
    */
  async shutdown (): Promise<void> {
    if (!this._app.documents.isClean()) {
      this._app.log.error('[Application] Attention! The FSAL reported there were unsaved changes to certain files. This indicates a critical logical bug in the application!')
    }
  }
}
