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

const { app } = require('electron')
const path = require('path')

// Internal classes
const ZettlrIPC = require('./zettlr-ipc.js')
const ZettlrWindow = require('./zettlr-window.js')
const ZettlrQLStandalone = require('./zettlr-ql-standalone.js')
const ZettlrStats = require('./zettlr-stats.js')
const FSAL = require('./modules/fsal')
const { loadI18nMain, trans } = require('../common/lang/i18n')
const ignoreDir = require('../common/util/ignore-dir')
const ignoreFile = require('../common/util/ignore-file')
const isDir = require('../common/util/is-dir')
const isFile = require('../common/util/is-file')
const loadCommands = require('./commands/_autoload')

/**
 * The Zettlr class handles every core functionality of Zettlr. Nothing works
 * without this. One object of Zettlr is created on initialization of the app
 * and will remain in memory until the app is quit completely. It will initialize
 * all additional classes that are needed, as well as prepare everything for
 * the main window to be opened. And, to complicate matters, my aim is to break
 * the 10.000 lines with this behemoth.
 */
class Zettlr {
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
    this._providers = {} // Holds all app providers (as properties of this object)

    this._commands = [] // This array holds all commands that can be performed
    loadCommands(this).then((cmd) => {
      this._commands = cmd
    }).catch((e) => {
      // TODO: In case the commands can't be loaded we should definitely shut
      // down the app
      global.log.error(e.message, e)
    })

    // Inject some globals
    global.application = {
      // Flag indicating whether or not the application is booting
      isBooting: () => { return this.isBooting },
      // TODO: Match the signatures of fileUpdate and dirUpdate
      fileUpdate: (oldHash, fileMetadata) => {
        if (typeof fileMetadata === 'number') {
          // NOTE: This will become permanent later on
          fileMetadata = this._fsal.findFile(fileMetadata)
        }
        this.ipc.send('file-replace', {
          'hash': oldHash,
          'file': this._fsal.getMetadataFor(fileMetadata)
        })
      },
      dirUpdate: (oldHash, newHash) => {
        let dir = this._fsal.findDir(newHash)
        this.ipc.send('dir-replace', {
          'hash': oldHash,
          'dir': this._fsal.getMetadataFor(dir)
        })
      },
      notifyChange: (msg) => {
        global.ipc.send('paths-update', this._fsal.getTreeMeta())
        global.ipc.notify(msg)
      },
      findFile: (prop) => { return this._fsal.findFile(prop) },
      findDir: (prop) => { return this._fsal.findDir(prop) },
      // Same as findFile, only with content
      getFile: (fileDescriptor) => { return this._fsal.getFileContents(fileDescriptor) }
    }

    // First thing that has to be done is to load the service providers
    this._bootServiceProviders()

    // Init translations
    let metadata = loadI18nMain(global.config.get('appLang'))

    // It may be that only a fallback has been provided or else. In this case we
    // must update the config to reflect this.
    if (metadata.tag !== global.config.get('appLang')) global.config.set('appLang', metadata.tag)

    // Boot up the IPC.
    this.ipc = new ZettlrIPC(this)

    // Statistics
    this.stats = new ZettlrStats(this)

    // Load in the Quicklook window handler class
    this._ql = new ZettlrQLStandalone()

    // And the window.
    this.window = new ZettlrWindow(this)

    // File System Abstraction Layer, pass the folder
    // where it can store its internal files.
    this._fsal = new FSAL(app.getPath('userData'))

    // Immediately determine if the cache needs to be cleared
    let shouldClearCache = process.argv.includes('--clear-cache')
    if (global.config.newVersionDetected() || shouldClearCache) {
      global.log.info('Clearing the FSAL cache ...')
      this._fsal.clearCache()
    }

    // Listen to changes in the file system
    this._fsal.on('fsal-state-changed', (objPath, info) => {
      // Emitted when anything in the state changes
      console.log(`FSAL state changed: ${objPath}`)
      if (this.isBooting) return // Only propagate these results when not booting
      switch (objPath) {
        // The root filetree has changed (added or removed root)
        case 'filetree':
          // Nothing specific, so send the full payload
          console.log('Sending full directory tree')
          global.ipc.send('paths-update', this._fsal.getTreeMeta())
          break
        case 'directory':
          // Only a directory has changed
          console.log('Sending small directory update')
          global.application.dirUpdate(info.oldHash, info.newHash)
          break
        case 'file':
          // Only a file has changed
          console.log('Sending small file update')
          global.application.fileUpdate(info.oldHash, info.newHash)
          break
        case 'fileSaved':
          if (!this.isModified()) this.getWindow().clearModified()
          break
        case 'fileContents':
          this._onFileContentsChanged(info)
          break
        case 'openDirectory':
          console.log('+++++ SENDING NEW DIRECTORY TO RENDERER +++++')
          this.ipc.send('dir-set-current', (this.getCurrentDir()) ? this.getCurrentDir().hash : null)
          global.config.set('lastDir', (this.getCurrentDir()) ? this.getCurrentDir().hash : null)
          break
        case 'openFiles':
          console.log('+++++ SYNCING OPEN FILES WITH RENDERER +++++')
          this.ipc.send('sync-files', this._fsal.getOpenFiles())
          global.config.set('openFiles', this._fsal.getOpenFiles())
          if (!this.isModified()) this.getWindow().clearModified()
          break
      }
    })

    process.nextTick(() => {
      let start = Date.now()
      // Read all paths into the app
      this.refreshPaths().then(() => {
        // If there are any, open argv-files
        this.handleAddRoots(global.filesToOpen).then(() => {
          // Reset the global so that no old paths are re-added
          global.filesToOpen = []
          // Verify the integrity of the targets after all paths have been loaded
          global.targets.verify()
          this.isBooting = false // Now we're done booting
          let duration = Date.now() - start
          duration /= 1000 // Convert to seconds
          global.log.info(`Loaded all roots in ${duration} seconds`)

          // Also, we need to (re)open all files in tabs
          this._fsal.setOpenFiles(global.config.get('openFiles'))

          // Now after all paths have been loaded, we are ready to load the
          // main window to get this party started!
          this.openWindow()
        }).catch((err) => {
          console.error(err)
          global.log.error('Could not add additional roots!', err.message)
          this.isBooting = false // Now we're done booting
        })
      }).catch((err) => {
        console.error(err)
        global.log.error('Could not load paths!', err.message)
        this.isBooting = false // Now we're done booting
      })
    })
  }

  /**
   * Boots the service providers
   * @return {void} Doesn't return
   */
  _bootServiceProviders () {
    // NOTE: The order these providers are loaded is important.
    this._providers = {
      'log': require('./providers/log-provider'),
      'config': require('./providers/config-provider'),
      'appearance': require('./providers/appearance-provider'),
      'watchdog': require('./providers/watchdog-provider'),
      'citeproc': require('./providers/citeproc-provider'),
      'dictionary': require('./providers/dictionary-provider'),
      'recentDocs': require('./providers/recent-docs-provider'),
      'tags': require('./providers/tag-provider'),
      'targets': require('./providers/target-provider'),
      'css': require('./providers/css-provider'),
      'translations': require('./providers/translation-provider')
    }
  }

  /**
   * Callback to perform necessary functions in order to replace file contents.
   *
   * @param {object} info The info object originally passed to the event.
   * @memberof Zettlr
   */
  _onFileContentsChanged (info) {
    let changedFile = this.findFile(info.hash)
    // The contents of one of the open files have changed.
    // What follows looks a bit ugly, welcome to callback hell.
    if (global.config.get('alwaysReloadFiles')) {
      this._fsal.getFileContents(changedFile).then((file) => {
        this.ipc.send('replace-file-contents', {
          'hash': info.hash,
          'contents': file.content
        })
      })
    } else {
      // The user did not check this option, so ask first
      this.getWindow().askReplaceFile(changedFile.name, (ret, alwaysReload) => {
        // Set the corresponding config option
        global.config.set('alwaysReloadFiles', alwaysReload)
        // ret can have three status: cancel = 0, save = 1, omit = 2.
        if (ret !== 1) return

        this._fsal.getFileContents(changedFile).then((file) => {
          this.ipc.send('replace-file-contents', {
            'hash': info.hash,
            'contents': file.content
          })
        })
      }) // END ask replace file
    }
  }

  /**
   * Shuts down all service providers.
   */
  async _shutdownServiceProviders () {
    for (let provider in this._providers) {
      await this._providers[provider].shutdown()
    }
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {void} Does not return anything.
    */
  async shutdown () {
    // Close all Quicklook Windows
    this._ql.closeAll()
    // Save the config and stats
    global.config.save()
    this.stats.save()
    // Perform closing activity in the path.
    for (let p of this._openPaths) {
      p.shutdown()
    }

    // Finally shut down the file system
    this._fsal.shutdown()

    // Finally, shut down the service providers
    await this._shutdownServiceProviders()
  }

  /**
    * Returns false if the file should not close, and true if it's safe.
    * @return {Boolean} Either true, if the window can close, or false.
    */
  async canClose () {
    if (this.isModified()) {
      // There is at least one file currently modified
      let modifiedFiles = this._fsal.getOpenFiles()
        .map(e => this._fsal.findFile(e))
        .filter(e => e.modified)
        .map(e => e.name) // Hello piping my old friend, I've come to use you once again ...

      let ret = await this.window.askSaveChanges(modifiedFiles)

      // Cancel: abort closing
      if (ret === 0) return false
    }
    return true
  }

  /**
    * This function is mainly called by the browser window to close the app.
    * @return {void} Does not return anything.
    */
  async saveAndClose () {
    if (await this.canClose()) {
      // "Hard reset" any edit flags that might prevent closing down of the app
      this.getWindow().clearModified()
      let modifiedFiles = this._fsal.getOpenFiles().map(e => this._fsal.findFile(e))

      // This is the programmatical middle finger to good state management
      for (let file of modifiedFiles) {
        this._fsal.markClean(file)
      }

      app.quit()
    }
  }

  async runCommand (evt, arg) {
    // This function will be called from IPC with a command and an arg.
    // First find the command
    let cmd = this._commands.find(elem => elem.respondsTo(evt))

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
      global.log.verbose('No command registered with the application for command ' + evt)
      throw new Error('No command registered with the application for command ' + evt)
    }
  }

  /**
    * Send a new directory list to the client.
    * @param  {Integer} arg A hash identifying the directory.
    * @return {void}     This function does not return anything.
    */
  selectDir (arg) {
    // arg contains a hash for a directory.
    let obj = this._fsal.findDir(arg)

    // Now send it back (the GUI should by itself filter out the files)
    if (obj && obj.type === 'directory') {
      this.setCurrentDir(obj)
    } else {
      global.log.error('Could not find directory', arg)
      this.window.prompt({
        type: 'error',
        title: trans('system.error.dnf_title'),
        message: trans('system.error.dnf_message')
      })
    }
  }

  /**
    * Open a new root.
    */
  async open () {
    // The user wants to open another file or directory.
    let ret = await this.window.askDir()
    // Let's see if the user has canceled or not provided a path
    if (ret.canceled || ret.filePaths.length === 0) return
    ret = ret.filePaths[0] // We only need the filePaths property, first element

    if ((isDir(ret) && ignoreDir(ret)) || (isFile(ret) && ignoreFile(ret)) || ret === app.getPath('home')) {
      // We cannot add this dir, because it is in the list of ignored directories.
      global.log.error('The chosen directory is on the ignore list.', ret)
      return this.window.prompt({
        'type': 'error',
        'title': trans('system.error.ignored_dir_title'),
        'message': trans('system.error.ignored_dir_message', path.basename(ret))
      })
    }
    global.ipc.notify(trans('system.open_root_directory', path.basename(ret)))
    await this.handleAddRoots([ret])
    global.ipc.notify(trans('system.open_root_directory_success', path.basename(ret)))
    global.ipc.send('paths-update', this._fsal.getTreeMeta())
  }

  /**
    * Handles a list of files and folders that the user in any way wants to add
    * to the app.
    * @param  {Array} filelist An array of absolute paths
    */
  async handleAddRoots (filelist) {
    // As long as it's not a forbidden file or ignored directory, add it.
    let newFile, newDir
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
      } else if (global.config.addPath(f)) {
        this._fsal.loadPath(f)
      } else {
        global.ipc.notify(trans('system.error.open_root_error', path.basename(f)))
      }
    }

    // Open the newly added path(s) directly.
    if (newDir) { this.setCurrentDir(newDir) }
    if (newFile) { this.sendFile(newFile.hash) }
  }

  /**
   * Opens a standalone quicklook window when the renderer requests it
   * @param  {number} hash The hash of the file to be displayed in the window
   * @return {void}      No return.
   */
  openQL (hash) { this._ql.openQuicklook(this._fsal.findFile(hash)) }

  /**
   * In case a root directory gets removed, indicate that fact by marking it
   * dead.
   * @param  {ZettlrDir} dir The dir to be removed
   * @return {void}     No return.
   */
  makeDead (dir) {
    if (dir === this.getCurrentDir()) this.setCurrentDir(null) // Remove current directory
    return console.log(`Marking directory ${dir.name} as dead!`)
  }

  /**
    * Reloads the complete directory tree.
    * @return {Promise} Resolved after the paths have been re-read
    */
  async refreshPaths () {
    // Reload all opened files, garbage collect will get the old ones.
    this._fsal.unloadAll()
    for (let p of global.config.get('openPaths')) {
      try {
        await this._fsal.loadPath(p)
      } catch (e) {
        global.log.info(`FSAL Removing path ${p}, as it does no longer exist.`)
        global.config.removePath(p)
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
    this.setCurrentFile(lastFile)
    if (lastFile) global.recentDocs.add(this._fsal.getMetadataFor(lastFile))
  }

  findFile (arg) { return this._fsal.findFile(arg) }
  findDir (arg) { return this._fsal.findDir(arg) }

  /**
    * Sets the current file to the given file.
    * @param {number} f A file hash
    */
  setCurrentFile (f) {
    this.currentFile = f
    global.config.set('lastFile', (f && f.hasOwnProperty('hash')) ? f.hash : f)
  }

  /**
    * Sets the current directory.
    * @param {ZettlrDir} d Directory to be selected.
    */
  setCurrentDir (d) {
    // Set the dir
    this._fsal.setOpenDirectory(d)
  }

  /**
   * Opens the file by moving it into the openFiles array on the FSAL.
   * @param {Number} arg The hash of a file to open
   */
  async openFile (arg) {
    console.log('Opening file ... ' + arg)
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
      this.window.prompt({
        type: 'error',
        title: trans('system.error.fnf_title'),
        message: trans('system.error.fnf_message')
      })
    }
  }

  /**
    * Send a file with its contents to the renderer process.
    * @param  {Integer} arg An integer containing the file's hash.
    * @return {void}     This function does not return anything.
    */
  async sendFile (arg) {
    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this._fsal.findFile(arg)

    if (file) {
      try {
        file = await this._fsal.getFileContents(file)
        this.ipc.send('file-open', file)
      } catch (e) {
        global.log.error(`Error sending file! ${file.name}`, e)
      }
    }
  }

  /**
    * Indicate modifications.
    * @return {void} Nothing to return here.
    */
  setModified (hash) {
    // Set the modify-indicator on the window
    // and tell the FSAL that a file has been
    // modified.
    let file = this._fsal.findFile(hash)
    if (file) {
      this._fsal.markDirty(file)
      this.window.setModified()
    } else {
      global.log.warning('The renderer reported a modified file, but the FSAL did not find that file.')
    }
  }

  /**
    * Remove the modification flag.
    * @return {void} Nothing to return.
    */
  clearModified (hash) {
    let file = this._fsal.findFile(hash)
    if (file) {
      this._fsal.markClean(file)
      if (this._fsal.isClean()) this.window.clearModified()
    } else {
      global.log.warning('The renderer reported a saved file, but the FSAL did not find that file.')
    }
  }

  /**
   * Convenience function to send a full file object to the renderer
   */
  sendPaths () { global.ipc.send('paths-update', this._fsal.getTreeMeta()) }

  /**
   * Sends all currently opened files to the renderer
   */
  async sendOpenFiles () {
    let files = this._fsal.getOpenFiles()

    for (let hash of files) {
      await this.sendFile(hash)
    }
  }

  // Getters

  /**
    * Returns the window instance.
    * @return {ZettlrWindow} The main window
    */
  getWindow () { return this.window }

  /**
    * Returns the IPC instance.
    * @return {ZettlrIPC}  The IPC object
    */
  getIPC () { return this.ipc }

  /**
    * Returns the updater
    * @return {ZettlrUpdater} The updater.
    */
  getUpdater () { return this._updater }

  /**
    * Returns the watchdog
    * @return {ZettlrWatchdog} The watchdog instance.
    */
  getWatchdog () { return this.watchdog }

  /**
    * Returns the stats
    * @return {ZettlrStats} The stats object.
    */
  getStats () { return this.stats }

  /**
    * Get the current directory.
    * @return {ZettlrDir} Current directory.
    */
  getCurrentDir () { return this._fsal.getOpenDirectory() }

  /**
    * Return the current file.
    * @return {Mixed} ZettlrFile or null.
    */
  getCurrentFile () { return this.currentFile }

  /**
   * Returns the File System Abstraction Layer
   */
  getFileSystem () { return this._fsal }

  /**
    * Called by the root directory to determine if it is root.
    * @return {Boolean} Always returns false.
    */
  isDirectory () { return false }

  /**
    * Are there unsaved changes currently in the file system?
    * @return {Boolean} Return true, if there are unsaved changes, or false.
    */
  isModified () { return !this._fsal.isClean() }

  /**
    * Open a new window.
    * @return {void} This does not return.
    */
  openWindow () { this.window.open() }

  /**
    * Close the current window.
    * @return {void} Does not return.
    */
  closeWindow () { this.window.close() }
}

// Export the module on require()
module.exports = Zettlr
