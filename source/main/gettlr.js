/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Gettlr class
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
const GettlrIPC = require('./gettlr-ipc.js')
const GettlrWindow = require('./gettlr-window.js')
const GettlrQLStandalone = require('./gettlr-ql-standalone.js')
const GettlrDir = require('./gettlr-dir.js')
const GettlrFile = require('./gettlr-file.js')
const GettlrDeadDir = require('./gettlr-dead-dir.js')
const GettlrTargets = require('./gettlr-targets.js')
const GettlrStats = require('./gettlr-stats.js')
const { loadI18nMain, trans } = require('../common/lang/i18n')
const hash = require('../common/util/hash')
const ignoreDir = require('../common/util/ignore-dir')
const ignoreFile = require('../common/util/ignore-file')
const isDir = require('../common/util/is-dir')
const isFile = require('../common/util/is-file')

const loadCommands = require('./commands/_autoload')

/**
 * The Gettlr class handles every core functionality of Gettlr. Nothing works
 * without this. One object of Gettlr is created on initialization of the app
 * and will remain in memory until the app is quit completely. It will initialize
 * all additional classes that are needed, as well as prepare everything for
 * the main window to be opened. And, to complicate matters, my aim is to break
 * the 10.000 lines with this behemoth.
 */
class Gettlr {
  /**
    * Create a new application object
    * @param {electron.app} parentApp The app object.
    */
  constructor () {
    this.isBooting = true // Only is true until the main process has fully loaded
    // INTERNAL VARIABLES
    this.currentFile = null // Currently opened file (object)
    this.currentDir = null // Current working directory (object)
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

    // First thing that has to be done is to load the service providers
    this._bootServiceProviders()

    // Init translations
    let metadata = loadI18nMain(global.config.get('appLang'))

    // It may be that only a fallback has been provided or else. In this case we
    // must update the config to reflect this.
    if (metadata.tag !== global.config.get('appLang')) global.config.set('appLang', metadata.tag)

    // Boot up the IPC.
    this.ipc = new GettlrIPC(this)

    // Inject some globals
    global.application = {
      // Flag indicating whether or not the application is booting
      isBooting: () => { return this.isBooting },
      fileUpdate: (oldHash, fileMetadata) => {
        this.ipc.send('file-replace', {
          'hash': oldHash,
          'file': fileMetadata
        })
      },
      dirUpdate: (oldHash, dirMetadata) => {
        this.ipc.send('dir-replace', {
          'hash': oldHash,
          'dir': dirMetadata
        })
      },
      notifyChange: (msg) => {
        global.ipc.send('paths-update', this.getPathDummies())
        global.ipc.notify(msg)
      },
      findFile: (prop) => {
        let obj = {}
        if (typeof prop === 'number') {
          obj.hash = prop
        } else if (typeof prop === 'string') {
          obj.path = prop
        } else {
          obj = prop
        }

        return this.findFile(obj)
      },
      findDir: (prop) => {
        let obj = {}
        if (typeof prop === 'number') {
          obj.hash = prop
        } else if (typeof prop === 'string') {
          obj.path = prop
        } else {
          obj = prop
        }

        return this.findDir(obj)
      }
    }

    // Statistics
    this.stats = new GettlrStats(this)

    // Instantiate the writing targets
    this._targets = new GettlrTargets(this)

    // Load in the Quicklook window handler class
    this._ql = new GettlrQLStandalone()

    // And the window.
    this.window = new GettlrWindow(this)
    this.openWindow()

    process.nextTick(() => {
      let start = Date.now()
      // Read all paths into the app
      this.refreshPaths().then(() => {
        // If there are any, open argv-files
        this.handleAddRoots(global.filesToOpen).then(() => {
          // Reset the global so that no old paths are re-added
          global.filesToOpen = []
          // Verify the integrity of the targets after all paths have been loaded
          this._targets.verify()
          this.isBooting = false // Now we're done booting
          let duration = Date.now() - start
          duration /= 1000 // Convert to seconds
          global.log.info(`Loaded all roots in ${duration} seconds`)
        }).catch((err) => {
          global.log.error('Could not add additional roots!', err)
          this.isBooting = false // Now we're done booting
        })
      }).catch((err) => {
        global.log.error('Could not load paths!', err)
        this.isBooting = false // Now we're done booting
      })
    })

    // Listen to certain events from the watchdog
    global.watchdog.on('unlink', (p) => {
      if (this.getCurrentFile() && (hash(p) === this.getCurrentFile().hash)) {
        // We need to close the file
        this.ipc.send('file-close')
        this.setCurrentFile(null) // Reset file
      }
    })

    global.watchdog.on('change', (p) => {
      let cur = this.getCurrentFile()
      if (!cur || cur.isScope(p) !== cur || !cur.hasChanged()) return
      // Current file has changed -> ask to replace
      // and do as the user wishes
      if (global.config.get('alwaysReloadFiles')) {
        this.ipc.send('file-open', cur.withContent())
      } else {
        // The user did not check this option, so ask first
        this.getWindow().askReplaceFile((ret, alwaysReload) => {
          // Set the corresponding config option
          global.config.set('alwaysReloadFiles', alwaysReload)
          // ret can have three status: cancel = 0, save = 1, omit = 2.
          // To keep up with semantics, the function "askSaveChanges" would
          // naturally return "true" if the user wants to save changes and "false"
          // - so how deal with "omit" changes?
          // Well I don't want to create some constants so let's just leave it
          // with these three values.
          if (ret === 1 || alwaysReload) this.ipc.send('file-open', cur.withContent())
        })
      }
    })
  }

  /**
   * Boots the service providers
   * @return {void} Doesn't return
   */
  _bootServiceProviders () {
    // The order is important, we'll just save them to this object
    this._providers = {
      'log': require('./providers/log-provider'),
      'config': require('./providers/config-provider'),
      'appearance': require('./providers/appearance-provider'),
      'watchdog': require('./providers/watchdog-provider'),
      'citeproc': require('./providers/citeproc-provider'),
      'dictionary': require('./providers/dictionary-provider'),
      'recentDocs': require('./providers/recent-docs-provider'),
      'tags': require('./providers/tag-provider'),
      'css': require('./providers/css-provider'),
      'translations': require('./providers/translation-provider')
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

    // Finally, shut down the service providers
    await this._shutdownServiceProviders()
  }

  /**
    * Returns false if the file should not close, and true if it's safe.
    * @return {Boolean} Either true, if the window can close, or false.
    */
  async canClose () {
    if (this.isModified()) {
      // The file is currently modified. Ask for saving.
      let ret = await this.window.askSaveChanges()

      // Cancel: abort opening a new file
      if (ret === 0) return false

      if (ret === 1) { // User wants to save the file first.
        this.ipc.send('file-save', {})
        return false
        // TODO: Implement into the event arguments a "intent" of closing
      }

      // Mark as if nothing has been changed
      if (ret === 2) this.clearModified()
    }
    return true
  }

  /**
    * This function is mainly called by the browser window to close the app.
    * @return {void} Does not return anything.
    */
  async saveAndClose () {
    if (await this.canClose()) {
      // Remember to clear the editFlag because otherwise the window
      // will refuse to close itself
      this.clearModified()
      app.quit()
    }
  }

  runCommand (evt, arg) {
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
    * Send a file with its contents to the renderer process.
    * @param  {Integer} arg An integer containing the file's hash.
    * @return {void}     This function does not return anything.
    */
  async sendFile (arg) {
    if (!await this.canClose()) return

    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this.findFile({ 'hash': parseInt(arg) })

    if (file != null) {
      this.setCurrentFile(file)
      this.ipc.send('file-open', file.withContent())
      // Add the file's metadata object to the recent docs
      global.recentDocs.add(file.getMetadata())
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
    * Send a new directory list to the client.
    * @param  {Integer} arg A hash identifying the directory.
    * @return {void}     This function does not return anything.
    */
  selectDir (arg) {
    // arg contains a hash for a directory.
    let obj = this.findDir({ 'hash': parseInt(arg) })

    // Now send it back (the GUI should by itself filter out the files)
    if (obj && obj.isDirectory() && obj.type !== 'dead-directory') {
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
      if ((newFile = this.findFile({ 'path': f })) != null) {
        // Also set the newDir variable so that Gettlr will automatically
        // navigate to the directory.
        newDir = newFile.parent
      } else if ((newDir = this.findDir({ 'path': f })) != null) {
        // Do nothing
      } else if (global.config.addPath(f)) {
        if (isFile(f)) {
          newFile = new GettlrFile(this, f)
          await newFile.scan() // Asynchronously scan file contents
          this._openPaths.push(newFile)
        } else {
          newDir = new GettlrDir(this, f)
          await newDir.scan() // Asynchronously pull in the directory tree
          this._openPaths.push(newDir)
        }
      } else {
        global.ipc.notify(trans('system.error.open_root_error', path.basename(f)))
      }
    }

    this._sortPaths()
    this.ipc.send('paths-update', this.getPathDummies())
    // Open the newly added path(s) directly.
    if (newDir) { this.setCurrentDir(newDir) }
    if (newFile) { this.sendFile(newFile.hash) }
  }

  /**
   * Opens a standalone quicklook window when the renderer requests it
   * @param  {number} hash The hash of the file to be displayed in the window
   * @return {void}      No return.
   */
  openQL (hash) { this._ql.openQuicklook(this.findFile({ 'hash': hash })) }

  /**
   * In case a root directory gets removed, indicate that fact by marking it
   * dead.
   * @param  {GettlrDir} dir The dir to be removed
   * @return {void}     No return.
   */
  makeDead (dir) {
    if (dir === this.getCurrentDir()) this.setCurrentDir(null) // Remove current directory
    let p = this.getPaths()
    for (let i = 0; i < p.length; i++) {
      if (p[i] === dir) p[i] = new GettlrDeadDir(this, dir.path)
    }
  }

  /**
    * Called by roots to remove themselves from the open paths.
    * @param  {Mixed} obj The root file or dir requesting removal.
    * @return {void}      Does not return.
    */
  remove (obj) {
    // This function is always called if root files are removed externally
    // and therefore want to remove themselves. This means we simply have
    // to splice the object from our paths array.
    this.getPaths().splice(this.getPaths().indexOf(obj), 1)
    this.ipc.send('paths-update', this.getPathDummies())
  }

  /**
    * Reloads the complete directory tree.
    * @return {Promise} Resolved after the paths have been re-read
    */
  async refreshPaths () {
    this._openPaths = []
    // Reload all opened files, garbage collect will get the old ones.
    for (let p of global.config.get('openPaths')) {
      if (isFile(p)) {
        let file = new GettlrFile(this, p)
        await file.scan()
        this._openPaths.push(file)
      } else if (isDir(p)) {
        let dir = new GettlrDir(this, p)
        await dir.scan()
        this._openPaths.push(dir)
      } else if (path.extname(p) === '') {
        // It's not a file (-> no extension) but it could not be found ->
        // mark it as "dead"
        this._openPaths.push(new GettlrDeadDir(this, p))
      } else {
        // Remove the path, because it obviously does not exist anymore
        global.log.info(`Removing path ${p}, as it does no longer exist.`)
        global.config.removePath(p)
      }
    }

    // Now send an update containing all paths, because these need to be present
    // in the renderer for the following setting of current dirs and files.
    this.ipc.send('paths-update', this.getPathDummies())

    // Set the pointers either to null or last opened dir/file
    let lastDir = this.findDir({ 'hash': parseInt(global.config.get('lastDir')) })
    let lastFile = this.findFile({ 'hash': parseInt(global.config.get('lastFile')) })
    this.setCurrentDir(lastDir)
    this.setCurrentFile(lastFile)
    if (lastFile) this.ipc.send('file-open', lastFile.withContent())

    // Also add the last file to the list of recent documents.
    if (lastFile !== null) global.recentDocs.add(lastFile.getMetadata())

    // Preset the window's title with the current file, if applicable
    this.window.fileUpdate()
  }

  /**
    * Wrapper to find files within all open paths
    * @param  {Object} obj An object that conforms with GettlrDir/GettlrFile::findFile()
    * @return {Mixed}     GettlrFile or null
    */
  findFile (obj) {
    if (obj.hasOwnProperty('hash') && obj.hash == null) {
      return null
    } else if (obj.hasOwnProperty('path') && obj.path == null) {
      return null
    }

    // We may have to cast the hash into a number, because stupid IPC doesn't care
    // about whether we transmit a number or a string.
    if (obj.hasOwnProperty('hash') && typeof obj.hash !== 'number') {
      obj.hash = parseInt(obj.hash)
    }

    let found = null
    for (let p of this.getPaths()) {
      found = p.findFile(obj)
      if (found != null) {
        return found
      }
    }

    return null
  }

  /**
    * Wrapper around findDir
    * @param  {Object} obj An object that conforms with GettlrDir/GettlrFile::findDir()
    * @return {Mixed}     GettlrDir or null
    */
  findDir (obj) {
    if (obj.hasOwnProperty('hash') && obj.hash == null) {
      return null
    } else if (obj.hasOwnProperty('path') && obj.path == null) {
      return null
    }

    // We may have to cast the hash into a number, because stupid IPC doesn't care
    // about whether we transmit a number or a string.
    if (obj.hasOwnProperty('hash') && typeof obj.hash !== 'number') {
      obj.hash = parseInt(obj.hash)
    }

    let found = null
    for (let p of this.getPaths()) {
      found = p.findDir(obj)
      if (found != null) {
        return found
      }
    }

    return null
  }

  /**
    * Either returns one file that matches its ID with the given term or null
    * @param  {String} term The ID to be searched for
    * @return {GettlrFile}      The exact match, or null.
    */
  findExact (term) {
    let found = null
    for (let p of this.getPaths()) {
      found = p.findExact(term)
      if (found != null) {
        return found
      }
    }

    return null
  }

  /**
    * Called when a root file is renamed. This is an alias for _sortPaths.
    */
  sort () {
    this._sortPaths()
  }

  /**
    * Sorts currently opened root paths
    */
  _sortPaths () {
    let f = []
    let d = []

    for (let p of this.getPaths()) {
      if (p.isFile()) {
        f.push(p)
      } else {
        d.push(p)
      }
    }

    f = f.sort((a, b) => {
      if (a.getName() < b.getName()) {
        return -1
      } else if (a.getName() > b.getName()) {
        return 1
      } else {
        return 0
      }
    })

    d = d.sort((a, b) => {
      if (a.getName() < b.getName()) {
        return -1
      } else if (a.getName() > b.getName()) {
        return 1
      } else {
        return 0
      }
    })

    this._openPaths = f.concat(d)
  }

  /**
    * Sets the current file to the given file.
    * @param {GettlrFile} f A GettlrFile object.
    */
  setCurrentFile (f) {
    this.currentFile = f
    this.ipc.send('file-set-current', (f && f.hasOwnProperty('hash')) ? f.hash : null)
    global.config.set('lastFile', (f && f.hasOwnProperty('hash')) ? f.hash : null)

    // Always adapt the window title
    if (this.window) this.window.fileUpdate()
  }

  /**
    * Sets the current directory.
    * @param {GettlrDir} d Directory to be selected.
    */
  setCurrentDir (d) {
    // Set the dir
    this.currentDir = d
    // HOLY SHIT. Sending only the hash instead of the whole object (which
    // has to be crunched to be send through the pipe) is SO MUCH FASTER.
    // Especially with virtual directories, because they got a LOT of
    // recursive stuff going on. And we can be sure, that this directory
    // will definitely exist in the renderer's memory, b/c we re-send the
    // paths each time we change them. So renderer should always be on the
    // newest update.
    this.ipc.send('dir-set-current', (d && d.hasOwnProperty('hash')) ? d.hash : null)
    global.config.set('lastDir', (d && d.hasOwnProperty('hash')) ? d.hash : null)
  }

  /**
    * Closes the current file and takes care of all steps necessary to accomodate.
    */
  closeFile () {
    this.setCurrentFile(null)
    this.ipc.send('file-close', {})
  }

  /**
    * Indicate modifications.
    * @return {void} Nothing to return here.
    */
  setModified () {
    this.window.setModified()
    this.editFlag = true
  }

  /**
    * Remove the modification flag. Also notify the renderer process so that
    * the editor can mark itself clear as well.
    * @return {void} Nothing to return.
    */
  clearModified () {
    this.window.clearModified()
    this.editFlag = false
    this.ipc.send('mark-clean')
  }

  // Getters

  /**
    * Returns the window instance.
    * @return {GettlrWindow} The main window
    */
  getWindow () { return this.window }

  /**
    * Returns the IPC instance.
    * @return {GettlrIPC}  The IPC object
    */
  getIPC () { return this.ipc }

  /**
    * Returns the directory tree. Thid does _not_, however, leave the paths
    * unchanged. It re-maps them and removes from the roots the pointer to this
    * object to prevent strange crashes of the app.
    * @return {GettlrDir} The root directory pointer.
    */
  getPaths () { return this._openPaths }

  getPathDummies () { return this._openPaths.map(elem => elem.getMetadata()) }

  /**
    * Returns the updater
    * @return {GettlrUpdater} The updater.
    */
  getUpdater () { return this._updater }

  /**
    * Returns the watchdog
    * @return {GettlrWatchdog} The watchdog instance.
    */
  getWatchdog () { return this.watchdog }

  /**
    * Returns the stats
    * @return {GettlrStats} The stats object.
    */
  getStats () { return this.stats }

  /**
    * Get the current directory.
    * @return {GettlrDir} Current directory.
    */
  getCurrentDir () { return this.currentDir }

  /**
    * Return the current file.
    * @return {Mixed} GettlrFile or null.
    */
  getCurrentFile () { return this.currentFile }

  /**
    * Called by the root directory to determine if it is root.
    * @return {Boolean} Always returns false.
    */
  isDirectory () { return false }

  /**
    * Is the current file modified?
    * @return {Boolean} Return true, if there are unsaved changes, or false.
    */
  isModified () { return this.editFlag }

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
module.exports = Gettlr
