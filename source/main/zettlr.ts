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

import {
  app,
  BrowserWindow,
  FileFilter,
  MessageBoxReturnValue
} from 'electron'

import { trans } from '@common/i18n-main'

import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from '@dts/main/fsal'
import { CodeFileMeta, MDFileMeta } from '@dts/common/fsal'

import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import extractFilesFromArgv from '../app/util/extract-files-from-argv'
import AppServiceContainer from '../app/app-service-container'

export default class Zettlr {
  isQuitting: boolean
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
    // Is the app quitting? True if quitting via menu, tray or keyboard shortcut.
    // False if titlebar `x` close, and all other times.
    this.isQuitting = false
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = [] // Holds all currently opened paths.
    this.isShownFor = [] // Contains all files for which remote notifications are currently shown

    // Inject some globals
    global.application = {
      isQuitting: () => {
        return this.isQuitting
      }
    }

    // Now that the config provider is definitely set up, let's see if we
    // should copy the interactive tutorial to the documents directory.
    if (this._app.config.isFirstStart()) {
      this._app.log.info('[First Start] Copying over the interactive tutorial!')
      this._app.commands.run('tutorial-open', {})
        .catch(err => this._app.log.error('[Application] Could not open tutorial', err))
    }

    // Immediately determine if the cache needs to be cleared
    let shouldClearCache = process.argv.includes('--clear-cache')
    if (this._app.config.newVersionDetected() || shouldClearCache) {
      this._app.log.info('Clearing the FSAL cache ...')
      this._app.fsal.clearCache()
    }

    // Listen to the before-quit event by which we make sure to only quit the
    // application if the status of possibly modified files has been cleared.
    // We listen to this event, because it will fire *before* the process
    // attempts to close the open windows, including the main window, which
    // would result in a loss of data. NOTE: The exception is the auto-updater
    // which will close the windows before this event. But because we also
    // listen to close-events on the main window, we should be able to handle
    // this, if we ever switched to the auto updater.
    app.on('before-quit', (event) => {
      this.isQuitting = true
      if (!this._app.documents.isClean()) {
        // Immediately prevent quitting ...
        event.preventDefault()
        this.isQuitting = false
        // ... and ask the user if we should *really* quit.
        this.askSaveChanges()
          .then(result => {
            // 0 = 'Close without saving changes',
            // 1 = 'Save changes'
            // 2 = 'Cancel
            if (result.response === 0) {
              // Clear the modification flags and close again
              this._app.documents.updateModifiedFlags([]) // Empty array = no modified files
              app.quit()
            } else if (result.response === 1) {
              // First, listen once to the event that all documents are clean
              // (i.e. it's safe to shut down) ...
              this._app.documents.once('documents-all-clean', () => {
                // The document manager reports all documents are clean now
                app.quit()
              })

              // ... and then have the renderer begin saving all changed docs.
              broadcastIpcMessage('save-documents', []) // Empty path list so the Editor saves all
            } // Else: Do nothing (abort quitting)
          })
          .catch(e => this._app.log.error('[Application] Could not ask the user to save their changes, because the message box threw an error. Not quitting!', e))
      }
    })

    // If the user wants to close the main window (either during quitting or
    // by closing the window itself) we have to prevent this if not all files
    // are clean. NOTE: The two events before-quit and onBeforeMainWindowClose
    // make sure that this logic works on all platforms:
    // If the main window is closed, quitting will work because no file can be
    // modified without the main window being open. If the main window is still
    // open, that will already prevent the quitting. As soon as the main window
    // is closed on any platform, the "windows-all-closed" will quit the app
    // successfully in any case.
    this._app.windows.onBeforeMainWindowClose(() => {
      if (!this._app.documents.isClean()) {
        this.askSaveChanges()
          .then(result => {
            // 0 = 'Close without saving changes',
            // 1 = 'Save changes'
            // 2 = 'Cancel
            if (result.response === 0) {
              // Clear the modification flags and close again
              this._app.documents.updateModifiedFlags([]) // Empty array = no modified files
              this._app.windows.closeMainWindow()
            } else if (result.response === 1) {
              // First, listen once to the event that all documents are clean
              // (i.e. it's safe to shut down) ...
              this._app.documents.once('documents-all-clean', () => {
                // The document manager reports all documents are clean now
                this._app.windows.closeMainWindow()
              })

              // ... and then have the renderer begin saving all changed docs.
              broadcastIpcMessage('save-documents', []) // Empty path list so the Editor saves all
            } // Else: Do nothing (abort quitting)
          })
          .catch(e => this._app.log.error('[Application] Could not ask the user to save their changes, because the message box threw an error. Not quitting!', e))
      }
      // We must return false to prevent the window from closing
      return this._app.documents.isClean()
    })

    this._app.windows.on('main-window-closed', () => {
      // Reset the FSAL state history so that any new window will have a clean start
      this._app.fsal.resetFiletreeHistory()
    })

    // Listen to document manager changes
    this._app.documents.on('update', (scope: string, changedDescriptor?: MDFileDescriptor|CodeFileDescriptor) => {
      switch (scope) {
        case 'fileSaved':
        case 'openFiles':
          this._app.windows.setModified(this.isModified())
          broadcastIpcMessage('fsal-state-changed', 'openFiles') // TODO: Do we need this?
          break
        case 'activeFile':
          // The active file has changed; set it in the config and notify the
          // renderer process to switch to this file again.
          broadcastIpcMessage('fsal-state-changed', 'activeFile')
          break
        case 'openFileRemotelyChanged':
          if (changedDescriptor !== undefined) {
            // An open file has been changed --> handle this!
            this._onFileContentsChanged(changedDescriptor)
          }
          break
        default:
          this._app.log.warning('Received an Update from the document manager, but the scope was unknown: ' + scope)
          break
      }
    })

    // Listen to changes in the file system
    this._app.fsal.on('fsal-state-changed', (scope: string, changedPath: string) => {
      // Emitted when anything in the state changes
      const openDir = this._app.fsal.openDirectory
      switch (scope) {
        case 'filetree':
          broadcastIpcMessage('fsal-state-changed', 'filetree')
          break
        case 'openDirectory':
          this._app.config.set('openDirectory', (openDir !== null) ? openDir.path : null)
          broadcastIpcMessage('fsal-state-changed', 'openDirectory')
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
    // Start a timer to measure how long the roots take to load.
    const start = Date.now()

    // A note on allPromises and the Promise.all().finally()-chain below:
    // In this function we have two main tasks: Load the file tree and the
    // document manager. Since both processes are isolated from each other,
    // loading the FSAL before the DocumentManager could lead to visual lag,
    // just as vice versa (if the user is a maniac and has, like, 100 files
    // open). Since asynchronous code is written as if it were procedural using
    // async/await, we must forcefully detach both from each other. We do so by
    // simply not awaiting the promises the FSAL generates, and collect them.
    // Then, we stack all remaining set up code into the finally() below while
    // the document manager is simply awaited. This way everything loads as fast
    // as it can, and thus users with many files (as me) will have their
    // documents load slightly before the file tree is fully visible.
    const allPromises: Array<Promise<boolean>> = []

    // First: Initially load all paths
    for (let p of this._app.config.get('openPaths') as string[]) {
      const prom = this._app.fsal.loadPath(p)
      prom.catch(e => {
        console.error(e)
        this._app.log.info(`[Application] Removing path ${p}, as it does no longer exist.`)
        this._app.config.removePath(p)
      })

      allPromises.push(prom)
    }

    Promise.all(allPromises).finally(() => {
      // We allow some promises to fail, but after all have been dealt with,
      // we need to continue the set up process

      // Set the pointers either to null or last opened dir/file
      const openDir = this._app.config.get('openDirectory')
      if (typeof openDir === 'string') {
        try {
          const descriptor = this._app.fsal.findDir(openDir)
          this._app.fsal.openDirectory = descriptor
        } catch (err: any) {
          this._app.log.error(`[Application] Could not set open directory ${openDir}.`, err)
        }
      } // else: openDir was null

      // Verify the integrity of the targets
      this._app.targets.verify()

      // Finally: Open any new files we have in the process arguments.
      this._app.commands.run('roots-add', extractFilesFromArgv())
        .finally(() => {
          // Now we are done.
          const duration = Date.now() - start
          this._app.log.info(`Loaded all roots in ${duration / 1000} seconds`)
        })
    })

    // Finally, initiate a first check for updates
    await this._app.updates.check()

    if (this._app.updates.applicationUpdateAvailable()) {
      const { tagName } = this._app.updates.getUpdateState()
      this._app.log.info(`Update available: ${tagName}`)
      this._app.notifications.show(trans('dialog.update.new_update_available', tagName), 'Updates', () => {
        // The user has clicked the notification, so we can show the update window here
        this._app.windows.showUpdateWindow()
      })
    } else {
      this._app.notifications.show(trans('dialog.update.no_new_update'))
    }
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

  // /**
  //  * In case a root directory gets removed, indicate that fact by marking it
  //  * dead.
  //  * @param  {ZettlrDir} dir The dir to be removed
  //  * @return {void}     No return.
  //  */
  // makeDead (dir: Object): void {
  //   if (dir === this.getCurrentDir()) this.setCurrentDir(null) // Remove current directory
  //   return console.log(`Marking directory ${dir.name} as dead!`)
  // }

  findFile (arg: string): MDFileDescriptor | CodeFileDescriptor | null {
    return this._app.fsal.findFile(arg)
  }

  findDir (arg: string): DirDescriptor | null {
    return this._app.fsal.findDir(arg)
  }

  /**
    * Indicate modifications.
    */
  setModified (isModified: boolean): void {
    this._app.windows.setModified(isModified)
  }

  // Getters

  /**
    * Are there unsaved changes currently in the file system?
    * @return {Boolean} Return true, if there are unsaved changes, or false.
    */
  isModified (): boolean { return !this._app.documents.isClean() }

  /**
    * Shows the main window
    * @return {void} This does not return.
    */
  openWindow (): void {
    this._app.windows.showMainWindow()
  }

  /**
   * Shows any open window, or the main window, if none are open.
   */
  openAnyWindow (): void {
    this._app.windows.showAnyWindow()
  }

  /**
   * Returns the main application window
   *
   * @return  {BrowserWindow}  The main application window
   */
  getMainWindow (): BrowserWindow|null {
    return this._app.windows.getMainWindow()
  }

  /**
   * Displays the given target file in the print window
   *
   * @param   {string}  target  The target file path
   */
  showPrintWindow (target: string): void {
    this._app.windows.showPrintWindow(target)
  }

  // Convenience wrappers: Modules that have access to the application object
  // are able to prompt, ask for stuff, etc.
  async shouldOverwriteFile (filename: string): Promise<boolean> {
    return await this._app.windows.shouldOverwriteFile(filename)
  }

  async askDir (): Promise<string[]> {
    return await this._app.windows.askDir()
  }

  async askFile (filters: FileFilter[]|null = null, multiSel: boolean = false): Promise<string[]> {
    return await this._app.windows.askFile(filters, multiSel)
  }

  /**
   * Asks the user to provide a path to a new file. Takes a filename, in which
   * case the dialog will start in the last known directory of this specific
   * dialog, or a full absolute path, in which the dialog will start.
   *
   * @param   {string}              fileOrPathName   Either an absolute path or just a filename
   * @param   {BrowserWindow|null}  win              The window to attach to
   *
   * @return  {Promise<string|undefined>}            Resolves with a path or undefined
   */
  async saveFile (fileOrPathName: string): Promise<string|undefined> {
    return await this._app.windows.saveFile(fileOrPathName)
  }

  /**
   * Asks the user to save changes to modified files
   *
   * @return  {Promise<MessageBoxReturnValue>}  The answer from the user
   */
  async askSaveChanges (): Promise<MessageBoxReturnValue> {
    return await this._app.windows.askSaveChanges()
  }

  /**
   * Shortcut for accessing the pasteImageModal in the Window manager.
   *
   * @return  {Promise<any>} The data generated in the modal
   */
  async showPasteImageModal (startPath: string): Promise<any> {
    return await this._app.windows.showPasteImageModal(startPath)
  }

  /**
   * Presents a confirmation to the user whether or not they want to actually
   * remove a file or directory from the system.
   *
   * @param   {MDFileDescriptor}    descriptor     The descriptor in question
   *
   * @return  {Promise<boolean>}                   Resolves to true if the user confirms
   */
  async confirmRemove (descriptor: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): Promise<boolean> {
    return await this._app.windows.confirmRemove(descriptor)
  }

  /**
   * Prompts the user with information
   *
   * @param   {any}   options  The options
   */
  prompt (options: any): void {
    this._app.windows.prompt(options)
  }
}
