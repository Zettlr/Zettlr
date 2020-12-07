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

import { app, BrowserWindow, FileFilter } from 'electron'
import path from 'path'
import fs from 'fs'

// Internal classes
import ZettlrIPC from './zettlr-ipc'
import ZettlrStats from './zettlr-stats'
import WindowManager from './modules/window-manager'
import FSAL from './modules/fsal'
import { trans, findLangCandidates } from '../common/i18n'
import ignoreDir from '../common/util/ignore-dir'
import ignoreFile from '../common/util/ignore-file'
import isDir from '../common/util/is-dir'
import isFile from '../common/util/is-file'
import { commands } from './commands'
import hash from '../common/util/hash'

import { DirDescriptor, MDFileDescriptor } from './modules/fsal/types'

export default class Zettlr {
  isBooting: boolean
  currentFile: any
  editFlag: boolean
  _openPaths: any
  _fsal: FSAL
  ipc: ZettlrIPC
  _commands: any
  stats: ZettlrStats
  private readonly _windowManager: WindowManager

  /**
    * Create a new application object
    * @param {electron.app} parentApp The app object.
    */
  constructor () {
    this.isBooting = true // Only is true until the main process has fully loaded
    // INTERNAL VARIABLES
    this.currentFile = null // Currently opened file (object)
    // this.currentDir = null // Current working directory (object)
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = [] // Holds all currently opened paths.

    this._windowManager = new WindowManager()
    // Immediately load persisted session data from disk
    this._windowManager.loadData()
      .catch(e => global.log.error('[Application] Window Manager could not load data', e))

    // Inject some globals
    global.application = {
      // Flag indicating whether or not the application is booting
      isBooting: () => { return this.isBooting },
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
      findFile: (prop: any) => { return this._fsal.findFile(prop) },
      findDir: (prop: any) => { return this._fsal.findDir(prop) },
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

    // Statistics TODO: Convert to provider
    this.stats = new ZettlrStats(this)

    // File System Abstraction Layer, pass the folder
    // where it can store its internal files.
    this._fsal = new FSAL(app.getPath('userData'))

    // Immediately determine if the cache needs to be cleared
    let shouldClearCache = process.argv.includes('--clear-cache')
    if (global.config.newVersionDetected() === true || shouldClearCache) {
      global.log.info('Clearing the FSAL cache ...')
      this._fsal.clearCache()
    }

    // Listen to changes in the file system
    this._fsal.on('fsal-state-changed', (objPath: string, info: any) => {
      // Emitted when anything in the state changes
      if (this.isBooting) return // Only propagate these results when not booting

      let dir = this.getCurrentDir()
      switch (objPath) {
        case 'activeFile':
          // The active file has changed; set it in the config and notify the
          // renderer process to switch to this file again.
          global.config.set('lastFile', this._fsal.activeFile)
          this.ipc.send('sync-files', this._fsal.openFiles)
          break
        // The root filetree has changed (added or removed root)
        case 'filetree':
          // Nothing specific, so send the full payload
          global.ipc.send('paths-update', this._fsal.getTreeMeta())
          break
        case 'directory':
          // Only a directory has changed
          console.log('Updating directory in the renderer!')
          global.application.dirUpdate(info.oldHash, info.newHash)
          break
        case 'file':
          // Only a file has changed
          global.application.fileUpdate(info.oldHash, info.newHash)
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
        case 'fileContents':
          this._onFileContentsChanged(info)
          break
        case 'openDirectory':
          this.ipc.send('dir-set-current', (dir !== null) ? dir.hash : null)
          global.config.set('lastDir', (dir !== null) ? dir.hash : null)
          break
        case 'openFiles':
          this.ipc.send('sync-files', this._fsal.openFiles)
          global.config.set('openFiles', this._fsal.openFiles)
          if (!this.isModified()) {
            this._windowManager.setModified(false)
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
  _onFileContentsChanged (info: any): void {
    let changedFile = this.findFile(info.hash)
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
      // The user did not check this option, so ask first
      this._windowManager.askReplaceFile(changedFile.name)
        .then((shouldReplace) => {
          if (!shouldReplace) {
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
    let start = Date.now()
    // First: Initially load all paths
    for (let p of global.config.get('openPaths') as string[]) {
      try {
        await this._fsal.loadPath(p)
      } catch (e) {
        console.error(e)
        global.log.info(`FSAL Removing path ${p}, as it does no longer exist.`)
        // global.config.removePath(p) TODO
      }
    }

    // Set the pointers either to null or last opened dir/file
    let lastDir = null
    let lastFile = null

    try {
      lastDir = this._fsal.findDir(global.config.get('lastDir'))
      lastFile = this._fsal.findFile(global.config.get('lastFile'))
    } catch (e) {
      console.log('Error on finding last dir or file', e)
    }

    this.setCurrentDir(lastDir)
    this.setCurrentFile((lastFile !== null) ? lastFile.hash : null)
    if (lastFile !== null) {
      global.recentDocs.add(this._fsal.getMetadataFor(lastFile))
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

    // Now after all paths have been loaded, we are ready to load the
    // main window to get this party started!
    this.openWindow()

    // Finally, initiate a first check for updates
    global.updates.check()
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {Promise} Resolves after the providers have shut down
    */
  async shutdown (): Promise<void> {
    // Save the stats
    this.stats.save()

    // Finally shut down the file system
    await this._fsal.shutdown()
  }

  /**
    * Returns false if the file should not close, and true if it's safe.
    * @return {Boolean} Either true, if the window can close, or false.
    */
  async canClose (): Promise<boolean> {
    if (this.isModified()) {
      global.log.error('[Application] There are unsaved changes. This indicates a bug, as everything should be saved before canClose() is called.')
      return false
    }
    return true
  }

  /**
    * This function is mainly called by the browser window to close the app.
    * @return {void} Does not return anything.
    */
  async saveAndClose (): Promise<void> {
    if (await this.canClose()) {
      // "Hard reset" any edit flags that might prevent closing down of the app
      this._windowManager.setModified(false)
      let modifiedFiles = this._fsal.openFiles.map((e: number) => this._fsal.findFile(e)).filter(e => e !== null)

      // This is the programmatical middle finger to good state management
      for (let file of modifiedFiles as MDFileDescriptor[]) {
        this._fsal.markClean(file)
      }

      app.quit()
    }
  }

  async runCommand (evt: String, arg: any): Promise<any> {
    // This function will be called from IPC with a command and an arg.
    // First find the command
    let cmd = this._commands.find((elem: any) => elem.respondsTo(evt))

    if (cmd) {
      // Return the return value of the command, if there is any
      try {
        return cmd.run(evt, arg)
      } catch (e) {
        global.log.error(e.message, e)
        // Re-throw for the IPC to handle a fall-through
        throw e
      }
    } else {
      // We need to throw, because the return value of a successful command run
      // may very well also evaluate to null, undefined, false or anything else.
      throw new Error(`No command registered with the application for command ${evt.toString()}`)
    }
  }

  /**
    * Send a new directory list to the client.
    * @param  {number} arg A hash identifying the directory.
    * @return {void}     This function does not return anything.
    */
  selectDir (arg: number): void {
    // arg contains a hash for a directory.
    let obj = this._fsal.findDir(arg)

    // Now send it back (the GUI should by itself filter out the files)
    if (obj !== null && obj.type === 'directory') {
      this.setCurrentDir(obj)
    } else {
      global.log.error('Could not find directory', arg)
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
    const rmdSupport = global.config.get('enableRMarkdown') as boolean
    const extensions = [ '.markdown', '.md', '.txt' ]
    if (rmdSupport) {
      extensions.push('.rmd')
    }

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
        if (file !== null) await this.openFile(file.hash)
      } else {
        global.notify.normal(trans('system.error.open_root_error', path.basename(f)))
        global.log.error(`Could not open new root file ${f}!`)
      }
    }

    // Open the newly added path(s) directly.
    if (newDir !== null) {
      this.setCurrentDir(newDir)
    }
    if (newFile !== null) {
      await this.sendFile(newFile.hash)
    }
  }

  /**
   * Opens a standalone quicklook window when the renderer requests it
   * @param  {number} hash The hash of the file to be displayed in the window
   * @return {void}      No return.
   */
  openQL (hash: number): void {
    let file: MDFileDescriptor|null = this._fsal.findFile(hash)
    if (file === null) {
      global.log.error(`[Application] A Quicklook window for ${hash} was requested, but the file was not found.`)
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

  findFile (arg: any): any { return this._fsal.findFile(arg) }
  findDir (arg: any): any { return this._fsal.findDir(arg) }

  /**
    * Sets the current file to the given file.
    * @param {Number} f A file hash
    */
  setCurrentFile (f: number|null): void {
    this.currentFile = f
    global.config.set('lastFile', f)
  }

  /**
    * Sets the current directory.
    * @param {ZettlrDir} d Directory to be selected.
    */
  setCurrentDir (d: DirDescriptor|null): void {
    // Set the dir
    this._fsal.openDirectory = d
  }

  /**
   * Opens the file by moving it into the openFiles array on the FSAL.
   * @param {Number} arg The hash of a file to open
   */
  async openFile (arg: number): Promise<void> {
    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this.findFile(arg)

    if (file != null) {
      // Add the file's metadata object to the recent docs
      // We only need to call the underlying function, it'll trigger a state
      // change event and will set in motion all other necessary processes.
      this._fsal.openFile(file)
      global.recentDocs.add(this._fsal.getMetadataFor(file))
      // Also, add to last opened files to persist during reboots
      global.config.addFile(file.path)
      await this.sendFile(file.hash)
    } else {
      global.log.error('Could not find file', arg)
      this._windowManager.prompt({
        type: 'error',
        title: trans('system.error.fnf_title'),
        message: trans('system.error.fnf_message')
      })
    }
  }

  /**
    * Send a file with its contents to the renderer process.
    * @param  {number} arg An integer containing the file's hash.
    * @return {void}     This function does not return anything.
    */
  async sendFile (arg: number): Promise<void> {
    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this._fsal.findFile(arg)

    if (file !== null) {
      try {
        let fileMeta = await this._fsal.getFileContents(file)
        this.ipc.send('file-open', fileMeta)
      } catch (e) {
        const fileName: String = file.name
        global.log.error(`Error sending file! ${fileName.toString()}`, e)
      }
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
    * Returns the stats
    * @return {ZettlrStats} The stats object.
    */
  getStats (): ZettlrStats { return this.stats }

  /**
    * Get the current directory.
    * @return {ZettlrDir} Current directory.
    */
  getCurrentDir (): DirDescriptor|null { return this._fsal.openDirectory }

  /**
    * Return the current file.
    * @return {Mixed} ZettlrFile or null.
    */
  getCurrentFile (): MDFileDescriptor|null { return this.currentFile }

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
  async askOverwriteFile (filename: string): Promise<boolean> {
    return await this._windowManager.askOverwriteFile(filename)
  }

  async askDir (): Promise<string[]> {
    return await this._windowManager.askDir()
  }

  async askFile (filters: FileFilter[]|null = null, multiSel: boolean = false): Promise<string[]> {
    return await this._windowManager.askFile(filters, multiSel)
  }

  /**
   * Presents a confirmation to the user whether or not they want to actually
   * remove a file or directory from the system.
   *
   * @param   {MDFileDescriptor}    descriptor     The descriptor in question
   *
   * @return  {Promise<boolean>}                   Resolves to true if the user confirms
   */
  async confirmRemove (descriptor: MDFileDescriptor|DirDescriptor): Promise<boolean> {
    return await this._windowManager.confirmRemove(descriptor)
  }
}
