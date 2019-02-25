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
const ZettlrConfig = require('./zettlr-config.js')
const ZettlrTags = require('./zettlr-tags.js')
const ZettlrDir = require('./zettlr-dir.js')
const ZettlrFile = require('./zettlr-file.js')
const ZettlrWatchdog = require('./zettlr-watchdog.js')
const ZettlrTargets = require('./zettlr-targets.js')
const ZettlrStats = require('./zettlr-stats.js')
const ZettlrDictionary = require('./zettlr-dictionary.js')
const ZettlrCiteproc = require('./zettlr-citeproc.js')
const { i18n, trans } = require('../common/lang/i18n.js')
const { hash, ignoreDir,
  ignoreFile, isFile, isDir } = require('../common/zettlr-helpers.js')

const loadCommands = require('./commands/_autoload')

const POLL_TIME = require('../common/data.json').poll_time

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
  constructor (parentApp) {
    // INTERNAL VARIABLES
    this.currentFile = null // Currently opened file (object)
    this.currentDir = null // Current working directory (object)
    this.editFlag = false // Is the current opened file edited?
    this._openPaths = []

    this._commands = [] // This array holds all commands that can be performed
    loadCommands(this).then((cmd) => {
      this._commands = cmd
    }).catch((e) => {
      // TODO: In case the commands can't be loaded we should definitely shut
      // down the app
      console.error(e)
    })

    // INTERNAL OBJECTS
    this.app = parentApp // Internal pointer to app object
    this.config = new ZettlrConfig(this)
    // Init translations
    let metadata = i18n(global.config.get('appLang'))

    // It may be that only a fallback has been provided or else. In this case we
    // must update the config to reflect this.
    if (metadata.tag !== global.config.get('appLang')) global.config.set('appLang', metadata.tag)

    this.ipc = new ZettlrIPC(this)

    // Initiate tags
    this._tags = new ZettlrTags(this)

    // Initiate the watchdog
    this.watchdog = new ZettlrWatchdog()

    // Statistics
    this.stats = new ZettlrStats(this)

    // Citeproc
    this._citeproc = new ZettlrCiteproc()

    // And the window.
    this.window = new ZettlrWindow(this)
    this.openWindow()

    // We have to instantiate the writing target class BEFORE we load in any
    // paths ...
    this._targets = new ZettlrTargets(this)

    // Read all paths into the app
    this.refreshPaths()

    // If there are any, open argv-files
    this.handleAddRoots(global.filesToOpen)

    // ... but afterwards, we have to check the integrity to remove any remnants
    // from previous files/folders.
    this._targets.verify()

    // Load in the Quicklook window handler class
    this._ql = new ZettlrQLStandalone()

    // Initiate regular polling
    setTimeout(() => {
      // We have to push this into the background, because otherwise the window
      // won't open. As usual: Everything time-consuming shouldn't be done in the
      // first tick of the app.
      this.dict = new ZettlrDictionary()

      // Begin to listen to events emitted by the dictionary
      this.dict.on('update', (event, loadedDicts) => {
        // Send an invalidation message to the renderer
        this.ipc.send('invalidate-dict')
      })
      this.poll()
    }, POLL_TIME)
  }

  /**
    * Performs recurring tasks such as polling the watchdog every five secs.
    * @return {void} Returns nothing.
    * @deprecated The watchdog polls will be put into an event listening system
    * in the future.
    */
  poll () {
    // Polls the watchdog for changes.
    if (this.watchdog.countChanges() > 0) {
      this.watchdog.each((e, p) => {
      // Available events: add, change, unlink, addDir, unlinkDir
      // No changeDir because this consists of one unlink and one add
        for (let root of this.getPaths()) {
          if (root.isScope(p) !== false) {
            let changed = root.handleEvent(p, e)
            let isCurrentFile = (this.getCurrentFile() && (hash(p) === this.getCurrentFile().hash))
            if (isCurrentFile && (e === 'unlink')) {
              // We need to close the file
              this.ipc.send('file-close')
              this.setCurrentFile(null) // Reset file
            } else if (isCurrentFile && (e === 'change') && changed) {
              // Current file has changed -> ask to replace and do
              // as the user wishes)
              this.getWindow().askReplaceFile((ret) => {
                // ret can have three status: cancel = 0, save = 1, omit = 2.
                // To keep up with semantics, the function "askSaveChanges" would
                // naturally return "true" if the user wants to save changes and "false"
                // - so how deal with "omit" changes?
                // Well I don't want to create some constants so let's just leave it
                // with these three values.
                if (ret === 1) this.ipc.send('file-open', this.getCurrentFile().withContent())
              })
            } // end if current file changed
          } // end if is scope
        } // end for
      })

      // flush all changes so they aren't processed again next cycle
      this.watchdog.flush()
      // Send a paths update to the renderer to reflect the changes.
      this.ipc.send('paths-update', this.getPathDummies())
    }

    setTimeout(() => { this.poll() }, POLL_TIME)
  }

  /**
    * Sends a notification together with a change event.
    * @param  {String} msg The message to be sent
    */
  notifyChange (msg) {
    this.ipc.send('paths-update', this.getPathDummies())
    global.ipc.notify(msg)
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {void} Does not return anything.
    */
  shutdown () {
    // Close all Quicklook Windows
    this._ql.closeAll()
    // Save the config and stats
    global.config.save()
    this.stats.save()
    // Stop the watchdog
    this.watchdog.stop()
    // Perform closing activity in the path.
    for (let p of this._openPaths) {
      p.shutdown()
    }
  }

  /**
    * Returns false if the file should not close, and true if it's safe.
    * @return {Boolean} Either true, if the window can close, or false.
    */
  canClose () {
    if (this.isModified()) {
      // The file is currently modified. Ask for saving.
      let ret = this.window.askSaveChanges()

      // Cancel: abort opening a new file
      if (ret === 0) {
        return false
      }

      if (ret === 1) { // User wants to save the file first.
        this.ipc.send('file-save', {})
        return false
        // TODO: Implement into the event arguments a "intent" of closing
      }

      // Mark as if nothing has been changed
      if (ret === 2) {
        this.clearModified()
      }
    }
    return true
  }

  /**
    * This function is mainly called by the browser window to close the app.
    * @return {void} Does not return anything.
    */
  saveAndClose () {
    if (this.canClose()) {
      // Remember to clear the editFlag because otherwise the window
      // will refuse to close itself
      this.clearModified()
      app.quit()
    }
  }

  runCommand (evt, arg) {
    // This function will be called from IPC with a command and an arg.
    // First find the command
    let cmd = this._commands.find((elem) => { return (elem.getEventName() === evt) })

    if (cmd) {
      // Return the return value of the command, if there is any
      try {
        return cmd.run(arg)
      } catch (e) {
        console.log(e)
      }
    } else {
      // We need to throw, because the return value of a successful command run
      // may very well also evaluate to null, undefined, false or anything else.
      throw new Error('Unknown command!')
    }
  }

  /****************************************************************************
   **                                                                        **
   **                                                                        **
   **                                                                        **
   **                          BEGIN EVENT HANDLE EVENTS                     **
   **                                                                        **
   **                                                                        **
   **                                                                        **
   ***************************************************************************/

  /**
    * Send a file with its contents to the renderer process.
    * @param  {Integer} arg An integer containing the file's hash.
    * @return {void}     This function does not return anything.
    */
  sendFile (arg) {
    if (!this.canClose()) {
      return
    }

    // arg contains the hash of a file.
    // findFile now returns the file object
    let file = this.findFile({ 'hash': parseInt(arg) })

    if (file != null) {
      this.setCurrentFile(file)
      this.ipc.send('file-open', file.withContent())
      // Add the file's metadata object to the recent docs
      global.config.addRecentDoc(file.getMetadata())
    } else {
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
    if (obj != null && obj.isDirectory()) {
      this.setCurrentDir(obj)
    } else {
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
  open () {
    // The user wants to open another file or directory.
    let ret = this.window.askDir()

    // The user may have provided no path at all, which returns in an
    // empty array -> check against and abort if array is empty
    if (!(ret && ret.length)) {
      return
    }

    // Ret is now an array. As we do not allow multiple selection, just
    // take the first index.
    ret = ret[0]

    if ((isDir(ret) && ignoreDir(ret)) || (isFile(ret) && ignoreFile(ret))) {
      // We cannot add this dir, because it is in the list of ignored directories.
      return this.window.prompt({
        'type': 'error',
        'title': trans('system.error.ignored_dir_title'),
        'message': trans('system.error.ignored_dir_message', path.basename(ret))
      })
    }

    this.handleAddRoots([ret])
  }

  /**
    * Handles a list of files and folders that the user in any way wants to add
    * to the app.
    * @param  {Array} filelist An array of absolute paths
    */
  handleAddRoots (filelist) {
    // As long as it's not a forbidden file or ignored directory, add it.
    let newFile, newDir
    for (let f of filelist) {
      // First check if this thing is already added. If so, simply write
      // the existing file/dir into the newFile/newDir vars. They will be
      // opened accordingly.
      if ((newFile = this.findFile({ 'path': f })) != null) {
        // Also set the newDir variable so that Zettlr will automatically
        // navigate to the directory.
        newDir = newFile.parent
      } else if ((newDir = this.findDir({ 'path': f })) != null) {
        // Do nothing
      } else if (this.getConfig().addPath(f)) {
        if (isFile(f)) {
          newFile = new ZettlrFile(this, f)
          this._openPaths.push(newFile)
        } else {
          newDir = new ZettlrDir(this, f)
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

  /****************************************************************************
   **                                                                        **
   **                                                                        **
   **                                                                        **
   **                           END EVENT HANDLE EVENTS                      **
   **                                                                        **
   **                                                                        **
   **                                                                        **
   ***************************************************************************/

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
    * @return {void} This function does not return anything.
    */
  refreshPaths () {
    this._openPaths = []
    // Reload all opened files, garbage collect will get the old ones.
    for (let p of global.config.get('openPaths')) {
      if (isFile(p)) {
        this._openPaths.push(new ZettlrFile(this, p))
      } else if (isDir(p)) {
        this._openPaths.push(new ZettlrDir(this, p))
      }
    }
    // Set the pointers either to null or last opened dir/file
    this.setCurrentDir(this.findDir({ 'hash': parseInt(global.config.get('lastDir')) }))
    this.setCurrentFile(this.findFile({ 'hash': parseInt(global.config.get('lastFile')) }))
    this.window.fileUpdate() // Preset the window's title with the current file, if applicable
  }

  /**
    * Wrapper to find files within all open paths
    * @param  {Object} obj An object that conforms with ZettlrDir/ZettlrFile::findFile()
    * @return {Mixed}     ZettlrFile or null
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
    * @param  {Object} obj An object that conforms with ZettlrDir/ZettlrFile::findDir()
    * @return {Mixed}     ZettlrDir or null
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
    * @return {ZettlrFile}      The exact match, or null.
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
    * Closes an open file/dir if the hashes match
    * @param  {Number} hash The hash to be closed
    */
  close (hash) {
    for (let p of this.getPaths()) {
      if (p.getHash() === parseInt(hash)) {
        // If it's the current file, close it
        if (p === this.getCurrentFile()) {
          this.ipc.send('file-close')
          this.getWindow().setTitle()
        }
        if (p === this.getCurrentDir()) {
          this.setCurrentDir(null)
        }
        this.getConfig().removePath(p.getPath())
        this.getPaths().splice(this.getPaths().indexOf(p), 1)
        this.ipc.send('paths-update', this.getPathDummies())
        break
      }
    }
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
    * @param {ZettlrFile} f A ZettlrFile object.
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
    * @param {ZettlrDir} d Directory to be selected.
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
    * @return {ZettlrWindow} The main window
    */
  getWindow () { return this.window }

  /**
    * Returns the IPC instance.
    * @return {ZettlrIPC}  The IPC object
    */
  getIPC () { return this.ipc }

  /**
    * Returns the directory tree. Thid does _not_, however, leave the paths
    * unchanged. It re-maps them and removes from the roots the pointer to this
    * object to prevent strange crashes of the app.
    * @return {ZettlrDir} The root directory pointer.
    */
  getPaths () { return this._openPaths }

  getPathDummies () { return this._openPaths.map(elem => elem.getMetadata()) }

  /**
    * Returns the ZettlrConfig object
    * @return {ZettlrConfig} The configuration
    */
  getConfig () { return this.config }

  /**
    * Returns the ZettlrTags object
    * @return {ZettlrTags} The tags object
    */
  getTags () { return this._tags }

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
  getCurrentDir () { return this.currentDir }

  /**
    * Return the current file.
    * @return {Mixed} ZettlrFile or null.
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
module.exports = Zettlr
