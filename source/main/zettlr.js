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
const fs = require('fs')
const path = require('path')

// Internal classes
const ZettlrIPC = require('./zettlr-ipc.js')
const ZettlrWindow = require('./zettlr-window.js')
const ZettlrConfig = require('./zettlr-config.js')
const ZettlrTags = require('./zettlr-tags.js')
const ZettlrDir = require('./zettlr-dir.js')
const ZettlrFile = require('./zettlr-file.js')
const ZettlrWatchdog = require('./zettlr-watchdog.js')
const ZettlrStats = require('./zettlr-stats.js')
const ZettlrUpdater = require('./zettlr-updater.js')
const makeExport = require('./zettlr-export.js')
const ZettlrImport = require('./zettlr-import.js')
const ZettlrDictionary = require('./zettlr-dictionary.js')
const ZettlrCiteproc = require('./zettlr-citeproc.js')
const { i18n, trans } = require('../common/lang/i18n.js')
const { hash, ignoreDir,
  ignoreFile, isFile, isDir } = require('../common/zettlr-helpers.js')

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

    // INTERNAL OBJECTS
    this.window = null // Display content
    this.ipc = null // Communicate with said content
    this.app = parentApp // Internal pointer to app object
    this.config = null // Configuration file handler
    this.watchdog = null // Watchdog object

    this.config = new ZettlrConfig(this)
    // Init translations
    i18n(this.config.get('app_lang'))
    this.ipc = new ZettlrIPC(this)

    // Initiate tags
    this._tags = new ZettlrTags(this)

    // Initiate the watchdog
    this.watchdog = new ZettlrWatchdog()

    // Statistics
    this.stats = new ZettlrStats(this)

    // And the window.
    this.window = new ZettlrWindow(this)
    this.openWindow()

    // Read all paths into the app
    this.refreshPaths()

    // If there are any, open argv-files
    this.handleAddRoots(global.filesToOpen)

    this._updater = new ZettlrUpdater(this)

    // Initiate regular polling
    setTimeout(() => {
      // Begin loading the dictionaries and the citations in the background
      // We have to push this into the background, because otherwise the window
      // won't open. As usual: Everything time-consuming shouldn't be done in the
      // first tick of the app.
      this.dict = new ZettlrDictionary()
      this._citeproc = new ZettlrCiteproc()
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
              if (this.getWindow().askReplaceFile()) {
                this.ipc.send('file-open', this.getCurrentFile().withContent())
              }
            }
          }
        }
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
    this.notify(msg)
  }

  /**
    * Shutdown the app. This function is called on quit.
    * @return {void} Does not return anything.
    */
  shutdown () {
    this.config.save()
    this.stats.save()
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
    * Sorts a directory according to the argument
    * @param  {Object} arg An object containing both a hash and a sorting type
    */
  sortDir (arg) {
    if (!arg.hasOwnProperty('hash') || !arg.hasOwnProperty('type')) {
      return
    }

    let dir = this.findDir({ 'hash': parseInt(arg.hash) })
    if (dir === null) {
      return
    }

    dir.toggleSorting(arg.type)

    this.ipc.send('paths-update', this.getPathDummies())
  }

  /**
    * Create a new file.
    * @param  {Object} arg An object containing a hash of containing directory and a file name.
    * @return {void}     This function does not return anything.
    */
  newFile (arg) {
    // If the user ONLY decided to use special chars
    // or did not input anything abort the process.
    if (!this.canClose()) {
      return
    }

    let dir = null
    let file = null

    // There should be also a hash in the argument.
    if (arg.hasOwnProperty('hash')) {
      dir = this.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      dir = this.getCurrentDir()
    }

    // Create the file
    try {
      file = dir.newfile(arg.name, this.watchdog)
    } catch (e) {
      return this.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_file'),
        message: e.message
      })
    }

    // Send the new paths and open the respective file.
    this.ipc.send('paths-update', this.getPathDummies())
    this.setCurrentFile(file)
    this.ipc.send('file-open', file.withContent())
  }

  /**
    * Create a new directory.
    * @param  {Object} arg An object containing hash of containing and name of new dir.
    */
  newDir (arg) {
    let dir = null
    let curdir = null

    if (arg.hasOwnProperty('hash')) {
      curdir = this.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      curdir = this.getCurrentDir()
    }

    try {
      dir = curdir.newdir(arg.name, this.watchdog)
    } catch (e) {
      return this.window.prompt({
        type: 'error',
        title: trans('system.error.could_not_create_dir'),
        message: e.message
      })
    }

    // Re-render the directories, and then as well the file-list of the
    // current folder.
    this.ipc.send('paths-update', this.getPathDummies())

    // Switch to newly created directory.
    this.setCurrentDir(dir)
  }

  /**
    * Creates a new virtual directory
    * @param  {Object} arg The argument, containing both the containing hash and the new name
    */
  newVirtualDir (arg) {
    let dir = null
    if (arg.hasOwnProperty('hash')) {
      dir = this.findDir({ 'hash': parseInt(arg.hash) })
    } else {
      dir = this.getCurrentDir()
    }

    // Create the vd
    let vd = dir.addVirtualDir(arg.name)
    this.ipc.send('paths-update', this.getPathDummies())
    this.setCurrentDir(vd)
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
        this.notify(trans('system.error.open_root_error', path.basename(f)))
      }
    }

    this._sortPaths()
    this.ipc.send('paths-update', this.getPathDummies())
    // Open the newly added path(s) directly.
    if (newDir) { this.setCurrentDir(newDir) }
    if (newFile) { this.sendFile(newFile.hash) }
  }

  /**
    * Removes a file.
    * @param  {number} [hash=this.getCurrentFile().hash] The hash of the file to be deleted.
    * @return {void}                                   This function does not return.
    */
  removeFile (hash = this.getCurrentFile().hash) {
    // First determine if this is modified.
    if (!this.canClose()) {
      return
    }

    let file = this.findFile({ 'hash': parseInt(hash) })

    if (!this.window.confirmRemove(file)) {
      return
    }

    // Now that we are save, let's move the current file to trash.
    if (this.getCurrentFile() && (file.hash === this.getCurrentFile().hash)) {
      this.ipc.send('file-close', {})
      // Tell main & renderer to close file references
      this.setCurrentFile(null)
    }
    file.remove()
    this.ipc.send('paths-update', this.getPathDummies())
  }

  /**
    * Remove a directory.
    * @param  {Integer} [hash=this.getCurrentDir().hash] The hash of dir to be deleted.
    * @return {void}                                  This function does not return anything.
    */
  removeDir (hash = this.getCurrentDir().hash) {
    let filedir = null
    let dir = null

    // First determine if this is modified.
    if (this.getCurrentFile() == null) {
      filedir = ''
    } else {
      filedir = this.getCurrentFile().parent // Oh I knew this would be clever :>
    }

    dir = this.findDir({ 'hash': parseInt(hash) })

    if (filedir === dir && !this.canClose()) {
      return
    }

    if (!this.window.confirmRemove(dir)) {
      return
    }

    // Close the current file, if there is one open
    if ((this.getCurrentFile() != null) && dir.contains(this.getCurrentFile())) {
      this.closeFile()
    }

    if (dir === this.getCurrentDir() && !this.getCurrentDir().isRoot()) {
      this.setCurrentDir(dir.parent) // Move up one level
    } else if (dir === this.getCurrentDir() && this.getCurrentDir().isRoot()) {
      this.setCurrentDir(null) // Simply reset the current dir pointer
    }

    // Now that we are save, let's move the current directory to trash.
    this.watchdog.ignoreNext('unlinkDir', dir.path)

    dir.remove()

    this.ipc.send('paths-update', this.getPathDummies())
  }

  /**
    * Removes a file from the index of a virtual directory.
    * @param  {Object} cnt Should contain both hash and virtualdir (also a hash)
    */
  removeFromVirtualDir (cnt) {
    let vd = this.findDir({ 'hash': parseInt(cnt.virtualdir) })
    let file = null
    if (vd) {
      file = vd.findFile({ 'hash': parseInt(cnt.hash) })
    }
    if (vd && file) {
      vd.remove(file)
      this.ipc.send('paths-update', this.getPathDummies())
    }
  }

  /**
    * Export a file to another format.
    * @param  {Object} arg An object containing hash and wanted extension.
    * @return {void}     Does not return.
    */
  exportFile (arg) {
    let file = this.findFile({ 'hash': parseInt(arg.hash) })
    let opt = {
      'format': arg.ext, // Which format: "html", "docx", "odt", "pdf"
      'file': file, // The file to be exported
      'dest': (this.config.get('export.dir') === 'temp') ? app.getPath('temp') : file.parent.path, // Either temp or cwd
      'stripIDs': this.config.get('export.stripIDs'),
      'stripTags': this.config.get('export.stripTags'),
      'stripLinks': this.config.get('export.stripLinks'),
      'pdf': this.config.get('pdf'),
      'title': file.name.substr(0, file.name.lastIndexOf('.')),
      'author': this.config.get('pdf').author,
      'keywords': this.config.get('pdf').keywords
    }

    // Call the exporter.
    try {
      makeExport(opt)
      this.notify(trans('system.export_success', opt.format.toUpperCase()))
    } catch (err) {
      this.notify(err.name + ': ' + err.message) // Error may be thrown
    }
  }

  /**
    * This function asks the user for a list of files and then imports them.
    * @return {void} Does not return.
    */
  importFile () {
    if (!this.getCurrentDir()) {
      return this.notify(trans('system.import_no_directory'))
    }

    // First ask the user for a fileList
    let fileList = this.window.askFile()
    if (!fileList || fileList.length === 0) {
      // The user seems to have decided not to import anything. Gracefully
      // fail. Not like the German SPD.
      return
    }

    // Now import.
    this.notify(trans('system.import_status'))
    try {
      let ret = ZettlrImport(fileList, this.getCurrentDir(), (file, error) => {
        // This callback gets called whenever there is an error while running pandoc.
        this.notify(trans('system.import_error', path.basename(file)))
      }, (file) => {
        // And this on each success!
        this.notify(trans('system.import_success', path.basename(file)))
      })

      if (ret.length > 0) {
        // Some files failed to import.
        this.notify(trans('system.import_fail', ret.length, ret.map((x) => { return path.basename(x) }).join(', ')))
      }
    } catch (e) {
      // There has been an error on importing (e.g. Pandoc was not found)
      // This catches this and displays it.
      this.notify(e.message)
    }
  }

  /**
    * Renames a directory.
    * @param  {Object} arg An object containing a hash.
    * @return {void}     This function does not return anything.
    */
  renameDir (arg) {
    // { 'hash': hash, 'name': val }
    let dir = this.findDir({ 'hash': parseInt(arg.hash) })

    let oldDir = path.dirname(dir.path)

    // Save for later whether this is the currentDir (have to re-send dir list)
    let isCurDir = ((this.getCurrentDir() != null) && (dir.hash === this.getCurrentDir().hash))
    let oldPath = null

    if ((this.getCurrentFile() !== null) && (dir.findFile({ 'hash': this.getCurrentFile().hash }) !== null)) {
      // The current file is in said dir so we need to trick a little bit
      oldPath = this.getCurrentFile().path
      let relative = oldPath.replace(dir.path, '') // Remove old directory to get relative path
      // Re-merge:
      oldPath = path.join(oldDir, arg.name, relative) // New path now
    }

    // Move to same location with different name
    dir.move(oldDir, arg.name)

    this.ipc.send('paths-update', this.getPathDummies())

    if (isCurDir) this.setCurrentDir(dir)

    if (oldPath != null) {
      // Re-set current file in the client
      let nfile = dir.findFile({ 'hash': hash(oldPath) })
      this.setCurrentFile(nfile)
    }
  }

  /**
    * Renames a file.
    * @param  {Object} arg An object containing hash and name.
    * @return {void}     This function does not return.
    */
  renameFile (arg) {
    // { 'hash': hash, 'name': val }
    let file = null
    let oldpath = ''

    // Possibilities: Non-opened file or opened file
    if (this.getCurrentFile() && (this.getCurrentFile().hash === parseInt(arg.hash))) {
      // Current file should be renamed.
      file = this.getCurrentFile()
      oldpath = file.path
      file.rename(arg.name, this.getWatchdog())

      // Adapt window title (manually trigger a fileUpdate)
      this.window.fileUpdate()
    } else {
      // Non-open file should be renamed.
      file = this.findFile({ 'hash': parseInt(arg.hash) })
      oldpath = file.path
      file.rename(arg.name, this.getWatchdog()) // Done.
    }

    // A root has been renamed -> reflect in openPaths
    if (this.getPaths().includes(file)) {
      let oP = this.getConfig().get('openPaths')
      for (let i = 0; i < oP.length; i++) {
        if (oP[i] === oldpath) {
          oP[i] = file.path
          this.getConfig().set('openPaths', oP)
          break
        }
      }
    }

    // Replace all relevant properties of the renamed file in renderer.
    this.ipc.send('file-replace', { 'hash': parseInt(arg.hash), 'file': file.getMetadata() })

    if (this.getCurrentFile() && this.getCurrentFile().hash === parseInt(arg.hash)) {
      // Also "re-set" the current file to trigger some additional actions
      // necessary to reflect the changes throughout the app.
      this.setCurrentFile(this.getCurrentFile())
    }
  }

  /**
    * Move a directory or a file.
    * @param  {Object} arg An object containing the hash of source and destination
    * @return {void}     This function does not return anything.
    */
  requestMove (arg) {
    // arg contains from and to
    let from = this.findDir({ 'hash': parseInt(arg.from) })
    if (from == null) {
      // Obviously a file!
      from = this.findFile({ 'hash': parseInt(arg.from) })
    }

    let to = this.findDir({ 'hash': parseInt(arg.to) })

    // Let's check that:
    if (from.contains(to)) {
      return this.window.prompt({
        type: 'error',
        title: trans('system.error.move_into_child_title'),
        message: trans('system.error.move_into_child_message')
      })
    }

    // Now check if there already is a directory/file with the same name
    if (to.hasChild({ 'name': from.name })) {
      return this.window.prompt({
        type: 'error',
        title: trans('system.error.already_exists_title'),
        message: trans('system.error.already_exists_message', from.name)
      })
    }

    // Now check if we've actually gotten a virtual directory
    if (to.isVirtualDirectory() && from.isFile()) {
      // Then simply attach.
      to.attach(from)
      // And, of course, refresh the renderer.
      this.ipc.send('paths-update', this.getPathDummies())
      return
    }

    let newPath = null

    if (from.isFile() && (this.getCurrentFile() != null) && (from.hash === this.getCurrentFile().hash)) {
      // Current file is to be moved
      // So move the file and immediately retrieve the new path
      this.watchdog.ignoreNext('unlink', from.path)
      this.watchdog.ignoreNext('add', path.join(to.path, from.name))
      from.move(to.path)
      to.attach(from)

      // Now our current file has been successfully moved and will
      // save correctly. Problem? The client needs it as well.
      // We have to set current dir (the to-dir) and current file AND
      // select it.
      this.setCurrentDir(to) // Current file is still correctly set
      this.ipc.send('paths-update', this.getPathDummies())
      return
    } else if ((this.getCurrentFile() !== null) &&
    (from.findFile({ 'hash': this.getCurrentFile().hash }) !== null)) {
      // The current file is in said dir so we need to trick a little bit
      newPath = this.getCurrentFile().path
      let relative = newPath.replace(from.path, '') // Remove old directory to get relative path
      // Re-merge:
      newPath = path.join(to.path, from.name, relative) // New path now
      // Hash it
      newPath = hash(newPath)
    }

    if (from.isDirectory()) {
      // TODO: Think of something to ignore _all_ events emanating from
      // the directory (every file will also trigger an unlink/add-couple)
      this.watchdog.ignoreNext('unlinkDir', from.path)
      this.watchdog.ignoreNext('addDir', path.join(to.path, from.name))
    } else if (from.isFile()) {
      this.watchdog.ignoreNext('unlink', from.path)
      this.watchdog.ignoreNext('add', path.join(to.path, from.name))
    }

    from.move(to.path)
    // Add directory or file to target dir
    to.attach(from)

    this.ipc.send('paths-update', this.getPathDummies())

    if (newPath != null) {
      // Find the current file and reset the pointers to it.
      this.setCurrentFile(from.findFile({ 'hash': newPath }))
    }
  }

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
    for (let p of this.getConfig().get('openPaths')) {
      if (isFile(p)) {
        this._openPaths.push(new ZettlrFile(this, p))
      } else if (isDir(p)) {
        this._openPaths.push(new ZettlrDir(this, p))
      }
    }
    // Set the pointers either to null or last opened dir/file
    this.setCurrentDir(this.findDir({ 'hash': parseInt(this.config.get('lastDir')) }))
    this.setCurrentFile(this.findFile({ 'hash': parseInt(this.config.get('lastFile')) }))
    this.window.fileUpdate() // Preset the window's title with the current file, if applicable
  }

  /**
    * Initiates the search for an update.
    */
  checkForUpdate () {
    this._updater.check()
  }

  /**
    * Simple wrapper for notifications.
    * @param  {String} message The message to be sent to the renderer.
    */
  notify (message) {
    this.ipc.send('notify', message)
  }

  /**
    * Saves a file. A file MUST be given, for the content is needed to write to
    * a file. Content is always freshly grabbed from the CodeMirror content.
    * @param  {Object} file An object containing some properties of the file.
    * @return {void}      This function does not return.
    */
  saveFile (file) {
    if ((file == null) || !file.hasOwnProperty('content')) {
      // No file given -> abort saving process
      return
    }

    let cnt = file.content

    // Update word count
    this.stats.updateWordCount(file.wordcount || 0)

    // This function saves a file to disk.
    // But: The hash is "null", if someone just
    // started typing with no file open.
    if (!file.hasOwnProperty('hash') || file.hash == null) {
      // For ease create a new file in current directory.
      if (this.getCurrentDir() == null) {
        switch (this.window.askSaveChanges()) {
          case 2: // Omit changes
            // Mark clean and force-close
            this.ipc.send('file-close', {})
            this.clearModified()
            break
          case 1: // Save changes
          case 0: // cancel
            // Abort saving process to let the user choose a dir
            this.notify(trans('system.save_changes_select_dir'))
            break
        }
        return
      }
      file = this.getCurrentDir().newfile(null, this.watchdog)
    } else {
      let f = this.getCurrentFile()
      if (f == null) {
        return this.window.prompt({
          type: 'error',
          title: trans('system.error.fnf_title'),
          message: trans('system.error.fnf_message')
        })
      }
      file = f
    }

    // Ignore the next change for this specific file
    this.watchdog.ignoreNext('change', file.path)
    file.save(cnt)
    this.clearModified()
    // Immediately update the paths in renderer so that it is able to find
    // the file to (re)-select it.
    this.ipc.send('file-update', file.getMetadata())

    // Switch to newly created file (only happens before a file is selected)
    if (this.getCurrentFile() == null) {
      this.setCurrentFile(file)
      // "Open" this file.
      this.sendFile(file.hash)
    }
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
    this.config.set('lastFile', (f && f.hasOwnProperty('hash')) ? f.hash : null)

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
    this.config.set('lastDir', (d && d.hasOwnProperty('hash')) ? d.hash : null)
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

  /**
    * Imports language files into the application's data directory.
    */
  importLangFile () {
    let files = this.getWindow().askLangFile()
    let langDir = path.join(app.getPath('userData'), '/lang/')

    // First test if the lang directory already exists
    try {
      fs.lstatSync(langDir)
    } catch (e) {
      // Create
      fs.mkdirSync(langDir)
    }

    for (let f of files) {
      if (/[a-z]{1,3}_[A-Z]{1,3}\.json/.test(path.basename(f))) {
        // It's a language file!
        try {
          fs.copyFileSync(f, path.join(langDir, path.basename(f)))
          this.notify(trans('system.lang_import_success', path.basename(f)))
        } catch (e) {
          this.notify(trans('system.lang_import_error', path.basename(f)))
        }
      } else {
        this.notify(trans('system.lang_import_error', path.basename(f)))
      }
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
