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

import { app, BrowserWindow, clipboard, FileFilter, ipcMain, MessageBoxReturnValue, nativeImage } from 'electron'
import path from 'path'
import fs from 'fs'

// Internal classes
import WindowManager from './modules/window-manager'
import DocumentManager from './modules/document-manager'

import FSAL from './modules/fsal'
import { trans } from '../common/i18n-main'
import findLangCandidates from '../common/util/find-lang-candidates'
import ignoreDir from '../common/util/ignore-dir'
import ignoreFile from '../common/util/ignore-file'
import isDir from '../common/util/is-dir'
import isFile from '../common/util/is-file'
import { commands } from './commands'

import { CodeFileDescriptor, CodeFileMeta, DirDescriptor, MDFileDescriptor, MDFileMeta } from './modules/fsal/types'
import broadcastIpcMessage from '../common/util/broadcast-ipc-message'
import extractFilesFromArgv from '../app/util/extract-files-from-argv'

export default class Zettlr {
  isQuitting: boolean
  editFlag: boolean
  _openPaths: any
  _fsal: FSAL
  _documentManager: DocumentManager
  _commands: any[]
  private readonly _windowManager: WindowManager
  private readonly isShownFor: string[]

  /**
    * Create a new application object
    * @param {electron.app} parentApp The app object.
    */
  constructor () {
    // Is the app quitting? True if quitting via menu, tray or keyboard shortcut.
    // False if titlebar `x` close, and all other times.
    this.isQuitting = false
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = [] // Holds all currently opened paths.
    this.isShownFor = [] // Contains all files for which remote notifications are currently shown

    this._windowManager = new WindowManager()

    // Inject some globals
    global.application = {
      runCommand: async (command: string, payload?: any) => {
        return await this.runCommand(command, payload)
      },
      isQuitting: () => {
        return this.isQuitting
      },
      showLogViewer: () => {
        this._windowManager.showLogWindow()
      },
      showDefaultsPreferences: () => {
        this._windowManager.showDefaultsWindow()
      },
      showPreferences: () => {
        this._windowManager.showPreferences()
      },
      showAboutWindow: () => {
        this._windowManager.showAboutWindow()
      },
      displayErrorMessage: (title: string, message: string, contents?: string) => {
        this._windowManager.showErrorMessage(title, message, contents)
      },
      showTagManager: () => {
        this._windowManager.showTagManager()
      },
      showAnyWindow: () => {
        this._windowManager.showAnyWindow()
      },
      findFile: (prop: any) => {
        return this._fsal.findFile(prop)
      },
      findDir: (prop: any) => {
        return this._fsal.findDir(prop)
      },
      // Same as findFile, only with content
      getFile: async (fileDescriptor: any) => {
        return await this._fsal.getFileContents(fileDescriptor)
      }
    }

    // Load available commands
    this._commands = commands.map(Command => new Command(this))

    // Now that the config provider is definitely set up, let's see if we
    // should copy the interactive tutorial to the documents directory.
    if (global.config.isFirstStart()) {
      global.log.info(`[First Start] Copying over the interactive tutorial to ${app.getPath('documents')}!`)
      this._prepareFirstStart()
    }

    // File System Abstraction Layer, pass the folder
    // where it can store its internal files.
    this._fsal = new FSAL(app.getPath('userData'))

    // Start up the document manager
    this._documentManager = new DocumentManager()

    // Immediately determine if the cache needs to be cleared
    let shouldClearCache = process.argv.includes('--clear-cache')
    if (global.config.newVersionDetected() || shouldClearCache) {
      global.log.info('Clearing the FSAL cache ...')
      this._fsal.clearCache()
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
      if (!this._documentManager.isClean()) {
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
              this._documentManager.updateModifiedFlags([]) // Empty array = no modified files
              app.quit()
            } else if (result.response === 1) {
              // First, listen once to the event that all documents are clean
              // (i.e. it's safe to shut down) ...
              this._documentManager.once('documents-all-clean', () => {
                // The document manager reports all documents are clean now
                app.quit()
              })

              // ... and then have the renderer begin saving all changed docs.
              broadcastIpcMessage('save-documents', []) // Empty path list so the Editor saves all
            } // Else: Do nothing (abort quitting)
          })
          .catch(e => global.log.error('[Application] Could not ask the user to save their changes, because the message box threw an error. Not quitting!', e))
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
    this._windowManager.onBeforeMainWindowClose(() => {
      if (!this._documentManager.isClean()) {
        this.askSaveChanges()
          .then(result => {
            // 0 = 'Close without saving changes',
            // 1 = 'Save changes'
            // 2 = 'Cancel
            if (result.response === 0) {
              // Clear the modification flags and close again
              this._documentManager.updateModifiedFlags([]) // Empty array = no modified files
              this._windowManager.closeMainWindow()
            } else if (result.response === 1) {
              // First, listen once to the event that all documents are clean
              // (i.e. it's safe to shut down) ...
              this._documentManager.once('documents-all-clean', () => {
                // The document manager reports all documents are clean now
                this._windowManager.closeMainWindow()
              })

              // ... and then have the renderer begin saving all changed docs.
              broadcastIpcMessage('save-documents', []) // Empty path list so the Editor saves all
            } // Else: Do nothing (abort quitting)
          })
          .catch(e => global.log.error('[Application] Could not ask the user to save their changes, because the message box threw an error. Not quitting!', e))
      }
      // We must return false to prevent the window from closing
      return this._documentManager.isClean()
    })

    this._windowManager.on('main-window-closed', () => {
      // Reset the FSAL state history so that any new window will have a clean start
      this._fsal.resetFiletreeHistory()
    })

    // Listen to document manager changes
    this._documentManager.on('update', (scope: string, changedDescriptor?: MDFileDescriptor|CodeFileDescriptor) => {
      switch (scope) {
        case 'fileSaved':
        case 'openFiles':
          this._windowManager.setModified(this.isModified())
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
          global.log.warning('Received an Update from the document manager, but the scope was unknown: ' + scope)
          break
      }
    })

    // Listen to changes in the file system
    this._fsal.on('fsal-state-changed', (scope: string, changedPath: string) => {
      // Emitted when anything in the state changes
      const openDir = this._fsal.openDirectory
      switch (scope) {
        case 'filetree':
          broadcastIpcMessage('fsal-state-changed', 'filetree')
          break
        case 'openDirectory':
          global.config.set('openDirectory', (openDir !== null) ? openDir.path : null)
          broadcastIpcMessage('fsal-state-changed', 'openDirectory')
          break
      }
    })

    // Runs a command through the application
    ipcMain.handle('application', async (event, { command, payload }) => {
      return await this.runCommand(command, payload)
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
    if (global.config.get('alwaysReloadFiles') === true) {
      this._documentManager.getFileContents(changedFile).then((file: MDFileMeta|CodeFileMeta) => {
        broadcastIpcMessage('open-file-changed', file)
      }).catch(e => global.log.error(e.message, e))
    } else {
      // Prevent multiple instances of the dialog, just ask once. The logic
      // always retrieves the most recent version either way
      const filePath = changedFile.path
      if (this.isShownFor.includes(filePath)) {
        return
      }
      this.isShownFor.push(filePath)

      // Ask the user if we should replace the file
      this._windowManager.shouldReplaceFile(changedFile.name)
        .then((shouldReplace) => {
          // In any case remove the isShownFor for this file.
          this.isShownFor.splice(this.isShownFor.indexOf(filePath), 1)
          if (!shouldReplace) {
            return
          }

          if (changedFile === null) {
            global.log.error('[Application] Cannot replace file.', changedFile)
            return
          }

          this._documentManager.getFileContents(changedFile).then((file: any) => {
            broadcastIpcMessage('open-file-changed', file)
          }).catch(e => global.log.error(e.message, e))
        }).catch(e => global.log.error(e.message, e)) // END ask replace file
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
    for (let p of global.config.get('openPaths') as string[]) {
      const prom = this._fsal.loadPath(p)
      prom.catch(e => {
        console.error(e)
        global.log.info(`[Application] Removing path ${p}, as it does no longer exist.`)
        global.config.removePath(p)
      })

      allPromises.push(prom)
    }

    Promise.all(allPromises).finally(() => {
      // We allow some promises to fail, but after all have been dealt with,
      // we need to continue the set up process

      // Set the pointers either to null or last opened dir/file
      const openDir = global.config.get('openDirectory')
      if (typeof openDir === 'string') {
        try {
          const descriptor = this._fsal.findDir(openDir)
          this._fsal.openDirectory = descriptor
        } catch (err) {
          global.log.error(`[Application] Could not set open directory ${openDir}.`, err)
        }
      } // else: openDir was null

      // Verify the integrity of the targets
      global.targets.verify()

      // Finally: Open any new files we have in the process arguments.
      this.handleAddRoots(extractFilesFromArgv())
        .finally(() => {
          // Now we are done.
          const duration = Date.now() - start
          global.log.info(`Loaded all roots in ${duration / 1000} seconds`)
        })
    })

    // Pre-set the state based on the configuration
    await this._documentManager.init()

    // Finally, initiate a first check for updates
    await global.updates.check()

    if (global.updates.applicationUpdateAvailable()) {
      const { tagName } = global.updates.getUpdateState()
      global.log.info(`Update available: ${tagName}`)
      global.notify.normal(trans('dialog.update.new_update_available', tagName), () => {
        // The user has clicked the notification, so we can show the update window here
        this._windowManager.showUpdateWindow()
      })
    } else {
      global.notify.normal(trans('dialog.update.no_new_update'))
    }
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {Promise} Resolves after the providers have shut down
    */
  async shutdown (): Promise<void> {
    if (!this._documentManager.isClean()) {
      global.log.error('[Application] Attention! The FSAL reported there were unsaved changes to certain files. This indicates a critical logical bug in the application!')
    }
    this._windowManager.shutdown()
    // Finally shut down the file system
    await this._fsal.shutdown()
  }

  /**
   * Runs a command through the application pipeline
   *
   * @param   {string}  command  The command to run
   * @param   {any}     payload  The payload, if any
   *
   * @return  {Promise<any>}     The return from running the command
   */
  async runCommand (command: string, payload: any): Promise<any> {
    // FIRST: Try to run a minimal command for which its own custom function
    // wouldn't make sense.
    if (command === 'open-workspace') {
      return await this.openWorkspace()
    } else if (command === 'open-root-file') {
      return await this.openRootFile()
    } else if (command === 'handle-drop') {
      // Handle any files dropped onto the editor
      return await this.handleAddRoots(payload)
    } else if (command === 'get-statistics-data') {
      return this._fsal.statistics
    } else if (command === 'get-filetree-events') {
      return this._fsal.filetreeHistorySince(payload)
    } else if (command === 'get-descriptor') {
      const descriptor = this._fsal.find(payload)
      if (descriptor === null) {
        return null
      }
      return this._fsal.getMetadataFor(descriptor)
    } else if (command === 'get-open-directory') {
      const openDir = this._fsal.openDirectory
      if (openDir === null) {
        return null
      }

      return this._fsal.getMetadataFor(openDir)
    } else if (command === 'set-open-directory') {
      this.selectDir(payload)
      return true
    } else if (command === 'get-active-file') {
      const descriptor = this._documentManager.activeFile
      if (descriptor === null) {
        return null
      }

      return this._fsal.getMetadataFor(descriptor as MDFileDescriptor)
    } else if (command === 'set-active-file') {
      const descriptor = this._documentManager.openFiles.find(elem => elem.path === payload) // this._fsal.findFile(payload)
      if (descriptor !== undefined) {
        this._documentManager.activeFile = descriptor
      }
    } else if (command === 'set-writing-target') {
      // Sets or updates a file's writing target
      global.targets.set(payload)
    } else if (command === 'open-file') {
      await this.openFile(payload.path, payload.newTab)
      return true
    } else if (command === 'get-open-files') {
      // Return all open files as their metadata objects
      return this._documentManager.openFiles.map(file => this._fsal.getMetadataFor(file))
    } else if (command === 'copy-img-to-clipboard') {
      // We should copy the contents of an image file to clipboard. Payload
      // contains the image path. We can rely on the Electron framework here.
      let imgPath: string = payload
      if (imgPath.startsWith('safe-file://')) {
        imgPath = imgPath.replace('safe-file://', '')
      } else if (imgPath.startsWith('file://')) {
        imgPath = imgPath.replace('file://', '')
      }

      const img = nativeImage.createFromPath(imgPath)

      if (!img.isEmpty()) {
        clipboard.writeImage(img)
      }
      return true
    } else if (command === 'get-file-contents') {
      // First, attempt to get the contents from the document manager
      const file = this._documentManager.openFiles.find(file => file.path === payload)
      if (file !== undefined) {
        return await this._documentManager.getFileContents(file)
      }

      // Otherwise, try to find the file via the FSAL
      const descriptor = this._fsal.findFile(payload)
      if (descriptor === null) {
        return null
      }

      return await this._fsal.getFileContents(descriptor)
    } else if (command === 'update-modified-files') {
      // Update the modification status according to the file path array given
      // in the payload.
      this._documentManager.updateModifiedFlags(payload)
      this.setModified(!this._documentManager.isClean())
    } else if (command === 'open-preferences') {
      this._windowManager.showPreferences()
      return true
    } else if (command === 'open-quicklook') {
      this.openQL(payload)
      return true
    } else if (command === 'open-stats-window') {
      this._windowManager.showStatsWindow()
      return true
    } else if (command === 'open-update-window') {
      this._windowManager.showUpdateWindow()
    } else if (command === 'open-project-preferences') {
      this._windowManager.showProjectPropertiesWindow(payload)
    } else {
      // ELSE: If the command has not yet been found, try to run one of the
      // bigger commands
      let cmd = this._commands.find((elem: any) => elem.respondsTo(command))
      if (cmd !== undefined) {
        // Return the return value of the command, if there is any
        try {
          return cmd.run(command, payload)
        } catch (err: any) {
          global.log.error('[Application] Error received while running command: ' + String(err.message), err)
          return false
        }
      } else {
        global.log.warning(`[Application] Received a request to run command ${command}, but it's not registered.`)
      }
    }
  }

  /**
   * Sets the active/open directory to the specified path.
   *
   * @param   {string}  dirPath  The directory's path
   */
  selectDir (dirPath: string): void {
    // arg contains a hash for a directory.
    let obj = this._fsal.findDir(dirPath)

    // Now send it back (the GUI should by itself filter out the files)
    if (obj !== null && obj.type === 'directory') {
      this._fsal.openDirectory = obj
    } else {
      global.log.error('Could not find directory', dirPath)
      this._windowManager.prompt({
        type: 'error',
        title: trans('system.error.dnf_title'),
        message: trans('system.error.dnf_message')
      })
    }
  }

  /**
    * Open a new workspace.
    */
  async openWorkspace (): Promise<void> {
    // TODO: Move this to a command
    // The user wants to open another file or directory.
    let ret = await this._windowManager.askDir()
    if (ret.length === 0) {
      return
    }

    let retPath = ret[0] // We only need one path

    if (
      (isDir(retPath) && ignoreDir(retPath)) ||
      (isFile(retPath) && ignoreFile(retPath)) ||
      retPath === app.getPath('home')
    ) {
      // We cannot add this dir, because it is in the list of ignored directories.
      global.log.error('The chosen workspace is on the ignore list.', ret)
      return this._windowManager.prompt({
        'type': 'error',
        'title': trans('system.error.ignored_dir_title'),
        'message': trans('system.error.ignored_dir_message', path.basename(retPath))
      })
    }

    global.notify.normal(trans('system.open_root_directory', path.basename(retPath)))
    await this.handleAddRoots([retPath])
    global.notify.normal(trans('system.open_root_directory_success', path.basename(retPath)))
  }

  /**
   * Open a new root file
   */
  async openRootFile (): Promise<void> {
    // TODO: Move this to a command
    // The user wants to open another file or directory.
    const extensions = [ 'markdown', 'md', 'txt', 'rmd' ]
    const filter = [{ 'name': trans('system.files'), 'extensions': extensions }]

    let ret = await this._windowManager.askFile(filter, true)
    await this.handleAddRoots(ret)
  }

  /**
    * Handles a list of files and folders that the user in any way wants to add
    * to the app.
    * @param  {string[]} filelist An array of absolute paths
    */
  async handleAddRoots (filelist: string[]): Promise<void> {
    // As long as it's not a forbidden file or ignored directory, add it.
    let newFile = null
    let newDir = null
    for (const f of filelist) {
      // First check if this thing is already added. If so, simply write
      // the existing file/dir into the newFile/newDir vars. They will be
      // opened accordingly.
      if ((newFile = this._fsal.findFile(f)) != null) {
        // Open the file immediately
        await this.openFile(newFile.path, true)
        // Also set the newDir variable so that Zettlr will automatically
        // navigate to the directory. The directory of the latest file will
        // remain open afterwards.
        newDir = newFile.parent
      } else if ((newDir = this._fsal.findDir(f)) != null) {
        // Do nothing
      } else if (global.config.addPath(f)) {
        try {
          const loaded = await this._fsal.loadPath(f)
          if (loaded) {
            // If it was a file and not a directory, immediately open it.
            let file = this._fsal.findFile(f)
            if (file !== null) {
              await this.openFile(file.path, true)
            }
          } else {
            global.config.removePath(f)
          }
        } catch (err: any) {
          // Something went wrong, so remove the path again.
          global.config.removePath(f)
          throw err // The caller needs to handle this.
        }
      } else {
        global.notify.normal(trans('system.error.open_root_error', path.basename(f)))
        global.log.error(`Could not open new root file ${f}!`)
      }
    }

    // Open the newly added path(s) directly.
    if (newDir !== null) {
      this._fsal.openDirectory = newDir
    }
  }

  /**
   * Opens a standalone quicklook window when the renderer requests it
   * @param  {number} hash The hash of the file to be displayed in the window
   * @return {void}      No return.
   */
  openQL (filePath: string): void {
    let file: MDFileDescriptor|CodeFileDescriptor|null = this._fsal.findFile(filePath)
    if (file === null || file.type !== 'file') {
      global.log.error(`[Application] A Quicklook window for ${filePath} was requested, but the file was not found.`)
      return
    }

    this._windowManager.showQuicklookWindow(file)
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
    return this._fsal.findFile(arg)
  }

  findDir (arg: string): DirDescriptor | null {
    return this._fsal.findDir(arg)
  }

  /**
   * Opens the file passed to this function
   *
   * @param   {string}   filePath  The filepath
   * @param   {boolean}  newTab    Optional. If true, will always prevent exchanging the currently active file.
   */
  async openFile (filePath: string, newTab?: boolean): Promise<void> {
    global.log.info(`[Application] Opening file ${filePath}`)
    // Add the file's metadata object to the recent docs
    // We only need to call the underlying function, it'll trigger a state
    // change event and will set in motion all other necessary processes.

    // Remember if the file that should be opened was already opened. Because in
    // this case we shouldn't close the active file (since we're not opening any
    // new tabs in any case.)
    const isFileAlreadyOpen = this._documentManager.openFiles.find(e => e.path === filePath) !== undefined
    const file = await this._documentManager.openFile(filePath)

    // The user determines if we should avoid new tabs. If we should do so,
    // only open new tabs if the user has checked this setting.
    const avoidNewTabs = Boolean(global.config.get('system.avoidNewTabs'))

    if (this._documentManager.activeFile !== null && newTab !== true && avoidNewTabs) {
      // We should avoid tabs, a new tab is not explicitly requested and we
      // have an active file to close.
      const activeFile = this._documentManager.activeFile

      // However, one caveat: If the new file that we are about to set active
      // was already open somewhere, we don't have to close this one, but rather
      // switch to the next file.
      if (activeFile !== null && !activeFile.modified && !isFileAlreadyOpen) {
        this._documentManager.closeFile(activeFile)
      }
    }

    this._documentManager.activeFile = file // Also make this thing active.
  }

  /**
    * Indicate modifications.
    */
  setModified (isModified: boolean): void {
    this._windowManager.setModified(isModified)
  }

  /**
   * This function prepares the app on first start, which includes copying over the tutorial.
   */
  _prepareFirstStart (): void {
    let tutorialPath = path.join(__dirname, 'tutorial')
    let targetPath = path.join(app.getPath('documents'), 'Zettlr Tutorial')
    let availableLanguages = fs.readdirSync(tutorialPath, { 'encoding': 'utf8' })

    let candidates = availableLanguages
      .map(e => { return { 'tag': e, 'path': path.join(tutorialPath, e) } })
      .filter(e => isDir(e.path))

    let { exact, close } = findLangCandidates(global.config.get('appLang'), candidates)

    let tutorial = path.join(tutorialPath, 'en')
    if (exact !== undefined) {
      tutorial = exact.path
    } else if (close !== undefined) {
      tutorial = close.path
    }

    // Now we have both a target and a language candidate, let's copy over the files!
    try {
      fs.lstatSync(targetPath)
      // Already exists! Abort!
      global.log.error(`The directory ${targetPath} already exists - won't overwrite!`)
      return
    } catch (err) {
      fs.mkdirSync(targetPath)

      // Now copy over every file from the directory
      let contents = fs.readdirSync(tutorial, { 'encoding': 'utf8' })
      for (let file of contents) {
        fs.copyFileSync(path.join(tutorial, file), path.join(targetPath, file))
      }
      global.log.info('Successfully copied the tutorial files', contents)

      // Now the last thing to do is set it as open
      global.config.addPath(targetPath)
      // Also set the welcome.md as open
      global.config.set('openFiles', [path.join(targetPath, 'welcome.md')])
      // ALSO the directory needs to be opened
      global.config.set('openDirectory', targetPath)
    }
  }

  // Getters

  /**
   * Returns the File System Abstraction Layer
   */
  getFileSystem (): FSAL { return this._fsal }

  /**
   * Returns the document manager
   */
  getDocumentManager (): DocumentManager { return this._documentManager }

  /**
    * Are there unsaved changes currently in the file system?
    * @return {Boolean} Return true, if there are unsaved changes, or false.
    */
  isModified (): boolean { return !this._documentManager.isClean() }

  /**
    * Shows the main window
    * @return {void} This does not return.
    */
  openWindow (): void {
    this._windowManager.showMainWindow()
  }

  /**
   * Shows any open window, or the main window, if none are open.
   */
  openAnyWindow (): void {
    this._windowManager.showAnyWindow()
  }

  /**
   * Returns the main application window
   *
   * @return  {BrowserWindow}  The main application window
   */
  getMainWindow (): BrowserWindow|null {
    return this._windowManager.getMainWindow()
  }

  /**
   * Displays the given target file in the print window
   *
   * @param   {string}  target  The target file path
   */
  showPrintWindow (target: string): void {
    this._windowManager.showPrintWindow(target)
  }

  // Convenience wrappers: Modules that have access to the application object
  // are able to prompt, ask for stuff, etc.
  async shouldOverwriteFile (filename: string): Promise<boolean> {
    return await this._windowManager.shouldOverwriteFile(filename)
  }

  async askDir (): Promise<string[]> {
    return await this._windowManager.askDir()
  }

  async askFile (filters: FileFilter[]|null = null, multiSel: boolean = false): Promise<string[]> {
    return await this._windowManager.askFile(filters, multiSel)
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
    return await this._windowManager.saveFile(fileOrPathName)
  }

  /**
   * Asks the user to save changes to modified files
   *
   * @return  {Promise<MessageBoxReturnValue>}  The answer from the user
   */
  async askSaveChanges (): Promise<MessageBoxReturnValue> {
    return await this._windowManager.askSaveChanges()
  }

  /**
   * Shortcut for accessing the pasteImageModal in the Window manager.
   *
   * @return  {Promise<any>} The data generated in the modal
   */
  async showPasteImageModal (startPath: string): Promise<any> {
    return await this._windowManager.showPasteImageModal(startPath)
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
    return await this._windowManager.confirmRemove(descriptor)
  }

  /**
   * Prompts the user with information
   *
   * @param   {any}   options  The options
   */
  prompt (options: any): void {
    this._windowManager.prompt(options)
  }
}
