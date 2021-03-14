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

import { app, BrowserWindow, FileFilter, ipcMain } from 'electron'
import path from 'path'
import fs from 'fs'

// Internal classes
import ZettlrIPC from './zettlr-ipc'
import WindowManager from './modules/window-manager'
import FSAL from './modules/fsal'
import { trans, findLangCandidates } from '../common/i18n'
import ignoreDir from '../common/util/ignore-dir'
import ignoreFile from '../common/util/ignore-file'
import isDir from '../common/util/is-dir'
import isFile from '../common/util/is-file'
import { commands } from './commands'
import hash from '../common/util/hash'

import { CodeFileDescriptor, DirDescriptor, MDFileDescriptor } from './modules/fsal/types'
import broadcastIpcMessage from '../common/util/broadcast-ipc-message'

export default class Zettlr {
  isBooting: boolean
  editFlag: boolean
  _openPaths: any
  _fsal: FSAL
  ipc: ZettlrIPC
  _commands: any[]
  private readonly _windowManager: WindowManager
  private readonly isShownFor: string[]

  /**
    * Create a new application object
    * @param {electron.app} parentApp The app object.
    */
  constructor () {
    this.isBooting = true // Only is true until the main process has fully loaded
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = [] // Holds all currently opened paths.
    this.isShownFor = [] // Contains all files for which remote notifications are currently shown

    this._windowManager = new WindowManager()
    // Immediately load persisted session data from disk
    this._windowManager.loadData()
      .catch(e => global.log.error('[Application] Window Manager could not load data', e))

    // Inject some globals
    global.application = {
      runCommand: async (command: string, payload?: any) => {
        return await this.runCommand(command, payload)
      },
      // Flag indicating whether or not the application is booting
      isBooting: () => {
        return this.isBooting
      },
      showLogViewer: () => {
        this._windowManager.showLogWindow()
      },
      showPreferences: () => {
        this._windowManager.showPreferences()
      },
      showCustomCSS: () => {
        this._windowManager.showCustomCSS()
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
      // TODO: Match the signatures of fileUpdate and dirUpdate
      fileUpdate: (oldHash: number, fileMetadata: any) => {
        if (typeof fileMetadata === 'number') {
          // NOTE: This will become permanent later on
          fileMetadata = this._fsal.findFile(fileMetadata)
        }
        this.ipc.send('file-replace', {
          'hash': oldHash,
          'file': this._fsal.getMetadataFor(fileMetadata)
        })
      },
      dirUpdate: (oldHash: number, newHash: number) => {
        let dir = this._fsal.findDir(newHash)
        if (dir === null) {
          return
        }

        this.ipc.send('dir-replace', {
          'hash': oldHash,
          'dir': this._fsal.getMetadataFor(dir)
        })
      },
      notifyChange: (msg: string) => {
        global.ipc.send('paths-update', this._fsal.getTreeMeta())
        global.notify.normal(msg)
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
    if (global.config.isFirstStart() === true) {
      global.log.info(`[First Start] Copying over the interactive tutorial to ${app.getPath('documents')}!`)
      this._prepareFirstStart()
    }

    // Boot up the IPC.
    this.ipc = new ZettlrIPC(this)

    // File System Abstraction Layer, pass the folder
    // where it can store its internal files.
    this._fsal = new FSAL(app.getPath('userData'))

    // Immediately determine if the cache needs to be cleared
    let shouldClearCache = process.argv.includes('--clear-cache')
    if (global.config.newVersionDetected() === true || shouldClearCache) {
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
      if (!this._fsal.isClean()) {
        // Immediately prevent quitting ...
        event.preventDefault()
        // ... and ask the user if we should *really* quit.
        this._windowManager.askSaveChanges()
          .then(result => {
            // TODO translate and agree on buttons!
            // 0 = 'Close without saving changes',
            // 1 = 'Save changes'
            if (result.response === 0) {
              // Clear the modification flags and close again
              this._fsal.updateModifiedFlags([]) // Empty array = no modified files
              app.quit()
            } else {
              // TODO: Following strategy for the "Save and then quit" behaviour:
              // 1. Broadcast an event to all renderers to immediately save all their changes
              // 2. Once that is done, quit. So we should watch the modification files, shouldn't we ...?
            }
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
      if (!this._fsal.isClean()) {
        this._windowManager.askSaveChanges()
          .then(result => {
            // TODO translate and agree on buttons!
            // 0 = 'Close without saving changes',
            // 1 = 'Save changes'
            if (result.response === 0) {
              // Clear the modification flags and close again
              this._fsal.updateModifiedFlags([]) // Empty array = no modified files
              this._windowManager.closeMainWindow()
            } else {
              // TODO: Following strategy for the "Save and then quit" behaviour:
              // 1. Broadcast an event to all renderers to immediately save all their changes
              // 2. Once that is done, quit. So we should watch the modification files, shouldn't we ...?
            }
          })
          .catch(e => global.log.error('[Application] Could not ask the user to save their changes, because the message box threw an error. Not quitting!', e))
      }
      // We must return false to prevent the window from closing
      return this._fsal.isClean()
    })

    // Listen to changes in the file system
    this._fsal.on('fsal-state-changed', (objPath: string, info: any) => {
      // Emitted when anything in the state changes
      const openDir = this._fsal.openDirectory
      switch (objPath) {
        case 'activeFile':
          // The active file has changed; set it in the config and notify the
          // renderer process to switch to this file again.
          global.config.set('activeFile', this._fsal.activeFile)
          broadcastIpcMessage('fsal-state-changed', 'activeFile')
          break
        case 'filetree':
          broadcastIpcMessage('fsal-state-changed', 'filetree')
          break
        case 'fileSaved':
          if (!this.isModified()) {
            this._windowManager.setModified(false)
          }
          // Mark this file as clean
          global.ipc.send('mark-clean', { 'hash': info.fileHash })
          // Re-send the file
          global.application.fileUpdate(info.fileHash, global.application.findFile(info.fileHash))
          break
        case 'openDirectory':
          global.config.set('openDirectory', (openDir !== null) ? openDir.path : null)
          broadcastIpcMessage('fsal-state-changed', 'openDirectory')
          break
        case 'openFiles':
          global.config.set('openFiles', this._fsal.openFiles)
          broadcastIpcMessage('fsal-state-changed', 'openFiles')
          if (!this.isModified()) {
            this._windowManager.setModified(false)
          }
          break
      }
    })

    // Handle Quicklook window requests for files TODO: Move this someplace else!
    ipcMain.handle('quicklook-controller', async (event, payload) => {
      const { command, hash } = payload
      // Last possibility: A quicklook window has requested a file. In this case
      // we mustn't obliterate the "event" because this way we don't need to
      // search for the window.
      if (command === 'get-file') {
        const fileDescriptor = this._fsal.findFile(hash)
        if (fileDescriptor === null) {
          global.log.error(`[Application] Could not get file descriptor for file ${String(hash)}.`)
          return
        }
        const fileMeta = await this._fsal.getFileContents(fileDescriptor)
        return fileMeta
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
  _onFileContentsChanged (info: any): void {
    // TODO: This function is currently not called, but we probably need this!!!
    let changedFile = this.findFile(info.hash)
    if (changedFile === null) {
      global.log.error('[Application] Could not handle remote change, as no descriptor was found.', info)
      return
    }

    // The contents of one of the open files have changed.
    // What follows looks a bit ugly, welcome to callback hell.
    if (global.config.get('alwaysReloadFiles') === true) {
      this._fsal.getFileContents(changedFile).then((file: any) => {
        this.ipc.send('replace-file-contents', {
          'hash': info.hash,
          'contents': file.content
        })
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

          this._fsal.getFileContents(changedFile).then((file: any) => {
            this.ipc.send('replace-file-contents', {
              'hash': info.hash,
              'contents': file.content
            })
          }).catch(e => global.log.error(e.message, e))
        }).catch(e => global.log.error(e.message, e)) // END ask replace file
    }
  }

  /**
   * Initiate the main process logic after boot.
   */
  async init (): Promise<void> {
    // Open the main window as a first thing to make the app feel snappy. The
    // algorithms will make sure the roots will appear one after another in the
    // main window.
    this.openWindow()

    let start = Date.now()
    // First: Initially load all paths
    for (let p of global.config.get('openPaths') as string[]) {
      try {
        await this._fsal.loadPath(p)
      } catch (e) {
        console.error(e)
        global.log.info(`[Application] Removing path ${p}, as it does no longer exist.`)
        global.config.removePath(p)
      }
    }

    // Set the pointers either to null or last opened dir/file
    let openDirectory = null
    let activeFile = null
    let openFiles = []

    try {
      openDirectory = this._fsal.findDir(global.config.get('openDirectory'))
      activeFile = this._fsal.findFile(global.config.get('activeFile'))
      openFiles = global.config.get('openFiles')
    } catch (e) {
      console.log('Error on finding last dir or file', e)
    }

    // Pre-set the state based on the configuration
    this._fsal.openFiles = openFiles
    this._fsal.openDirectory = openDirectory
    this._fsal.activeFile = (activeFile !== null) ? activeFile.path : null
    if (activeFile !== null) {
      global.recentDocs.add(this._fsal.getMetadataFor(activeFile))
    }
    // Second: handleAddRoots with global.filesToOpen
    await this.handleAddRoots(global.filesToOpen) // TODO

    // Reset the global so that no old paths are re-added
    global.filesToOpen = []
    // Verify the integrity of the targets after all paths have been loaded
    global.targets.verify()
    this.isBooting = false // Now we're done booting
    let duration = Date.now() - start
    duration /= 1000 // Convert to seconds
    global.log.info(`Loaded all roots in ${duration} seconds`)

    // Also, we need to (re)open all files in tabs
    this._fsal.openFiles = global.config.get('openFiles')

    // Finally, initiate a first check for updates
    global.updates.check()
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {Promise} Resolves after the providers have shut down
    */
  async shutdown (): Promise<void> {
    if (!this._fsal.isClean()) {
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
      const activeFile = this._fsal.activeFile
      if (activeFile === null) {
        return null
      }

      const descriptor = this.findFile(activeFile)
      if (descriptor === null) {
        return null
      }

      return this._fsal.getMetadataFor(descriptor as MDFileDescriptor)
    } else if (command === 'set-active-file') {
      const descriptor = this._fsal.findFile(payload)
      if (descriptor !== null) {
        this._fsal.activeFile = descriptor.path
      }
    } else if (command === 'set-writing-target') {
      // Sets or updates a file's writing target
      global.targets.set(payload)
    } else if (command === 'open-file') {
      this.openFile(payload)
      return true
    } else if (command === 'get-open-files') {
      const openFiles = this._fsal.openFiles
      const ret = []
      for (const openFilePath of openFiles) {
        const descriptor = this._fsal.findFile(openFilePath)
        if (descriptor !== null) {
          ret.push(this._fsal.getMetadataFor(descriptor))
        }
      }
      return ret
    } else if (command === 'get-file-contents') {
      const descriptor = this._fsal.findFile(payload)
      if (descriptor === null) {
        return null
      }

      const fileWithContents = await this._fsal.getFileContents(descriptor)
      return fileWithContents
    } else if (command === 'update-modified-files') {
      // Update the modification status according to the file path array given
      // in the payload.
      console.log('Updating modification status of the following paths:', payload)
      this._fsal.updateModifiedFlags(payload)
      this._windowManager.setModified(!this._fsal.isClean())
    } else if (command === 'open-workspace') {
      await this.openWorkspace()
      return true
    } else if (command === 'open-preferences') {
      this._windowManager.showPreferences()
      return true
    } else if (command === 'open-quicklook') {
      this.openQL(payload)
      return true
    } else if (command === 'open-stats-window') {
      this._windowManager.showStatsWindow()
      return true
    } else {
      // ELSE: If the command has not yet been found, try to run one of the
      // bigger commands
      let cmd = this._commands.find((elem: any) => elem.respondsTo(command))
      if (cmd !== undefined) {
        // Return the return value of the command, if there is any
        try {
          return cmd.run(command, payload)
        } catch (e) {
          global.log.error('[Application] Error received while running command: ' + String(e.message), e)
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
    global.ipc.send('paths-update', this._fsal.getTreeMeta())
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
    global.ipc.send('paths-update', this._fsal.getTreeMeta())
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
    for (let f of filelist) {
      // First check if this thing is already added. If so, simply write
      // the existing file/dir into the newFile/newDir vars. They will be
      // opened accordingly.
      if ((newFile = this._fsal.findFile(f)) != null) {
        // Also set the newDir variable so that Zettlr will automatically
        // navigate to the directory.
        newDir = newFile.parent
      } else if ((newDir = this._fsal.findDir(f)) != null) {
        // Do nothing
      } else if (global.config.addPath(f) === true) {
        let loaded = await this._fsal.loadPath(f)
        if (!loaded) continue
        let file = this._fsal.findFile(f)
        if (file !== null) await this.openFile(file.path)
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

  findFile (arg: string | number): MDFileDescriptor | CodeFileDescriptor | null {
    return this._fsal.findFile(arg)
  }

  findDir (arg: string | number): DirDescriptor | null {
    return this._fsal.findDir(arg)
  }

  /**
   * Opens the file passed to this function
   *
   * @param   {string}   filePath  The filepath
   */
  openFile (filePath: string): void {
    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this.findFile(filePath)

    if (file != null) {
      // Add the file's metadata object to the recent docs
      // We only need to call the underlying function, it'll trigger a state
      // change event and will set in motion all other necessary processes.
      this._fsal.openFile(file)
      global.recentDocs.add(this._fsal.getMetadataFor(file))
      // Also, add to last opened files to persist during reboots
      global.config.addFile(file.path)
      this._fsal.activeFile = file.path // Also make this thing active.
    } else {
      global.log.error('Could not find file', filePath)
      this._windowManager.prompt({
        type: 'error',
        title: trans('system.error.fnf_title'),
        message: trans('system.error.fnf_message')
      })
    }
  }

  /**
    * Indicate modifications.
    * @return {void} Nothing to return here.
    */
  setModified (hash: number): void {
    // Set the modify-indicator on the window
    // and tell the FSAL that a file has been
    // modified.
    let file = this._fsal.findFile(hash)
    if (file !== null) {
      this._fsal.markDirty(file)
      this._windowManager.setModified(true)
    } else {
      global.log.warning('The renderer reported a modified file, but the FSAL did not find that file.')
    }
  }

  /**
    * Remove the modification flag.
    * @return {void} Nothing to return.
    */
  clearModified (hash: number): void {
    let file = this._fsal.findFile(hash)
    if (file !== null) {
      this._fsal.markClean(file)
      if (this._fsal.isClean()) this._windowManager.setModified(false)
    } else {
      global.log.warning('The renderer reported a saved file, but the FSAL did not find that file.')
    }
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

    let { exact, close } = findLangCandidates(global.config.get('appLang'), candidates) as any

    let tutorial = path.join(tutorialPath, 'en')
    if (exact) tutorial = exact.path
    if (!exact && close) tutorial = close.path

    // Now we have both a target and a language candidate, let's copy over the files!
    try {
      fs.lstatSync(targetPath)
      // Already exists! Abort!
      global.log.error(`The directory ${targetPath} already exists - won't overwrite!`)
      return
    } catch (e) {
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
      global.config.addFile(path.join(targetPath, 'welcome.md'))
      // ALSO the directory needs to be opened
      global.config.set('lastDir', hash(targetPath))
    }
  }

  /**
   * Convenience function to send a full file object to the renderer
   */
  sendPaths (): void { global.ipc.send('paths-update', this._fsal.getTreeMeta()) }

  /**
   * Sends all currently opened files to the renderer
   */
  sendOpenFiles (): void { global.ipc.send('sync-files', this._fsal.openFiles) }

  // Getters

  /**
    * Returns the IPC instance.
    * @return {ZettlrIPC}  The IPC object
    */
  getIPC (): ZettlrIPC { return this.ipc }

  /**
   * Returns the File System Abstraction Layer
   */
  getFileSystem (): FSAL { return this._fsal }

  /**
    * Are there unsaved changes currently in the file system?
    * @return {Boolean} Return true, if there are unsaved changes, or false.
    */
  isModified (): boolean { return !this._fsal.isClean() }

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
