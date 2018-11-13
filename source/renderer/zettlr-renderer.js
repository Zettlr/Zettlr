/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrRenderer class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Controls the whole renderer process.
 *
 * END HEADER
 */

const ZettlrRendererIPC = require('./zettlr-rendereripc.js')
const ZettlrDirectories = require('./zettlr-directories.js')
const ZettlrPreview = require('./zettlr-preview.js')
const ZettlrEditor = require('./zettlr-editor.js')
const ZettlrBody = require('./zettlr-body.js')
const ZettlrToolbar = require('./zettlr-toolbar.js')
const ZettlrPomodoro = require('./zettlr-pomodoro.js')
const popup = require('./zettlr-popup.js')
const ZettlrStatsView = require('./zettlr-stats-view.js')
const ZettlrAttachments = require('./zettlr-attachments.js')

const remote = require('electron').remote
const path = require('path')

// Pull the poll-time from the data
const POLL_TIME = require('../common/data.json').poll_time

/**
 * This is the pendant class to the Zettlr class in the main process. It mirrors
 * the functionality of the main process, only that the functionality in here
 * is connected with the rendering, not with the reading of files, etc. This is
 * the only object that is directly referenced from with the index.html file --
 * this is why all the paths in here do not begin in the `renderer` directory,
 * but in the assets directory (which is where the index.htm resides).
 */
class ZettlrRenderer {
  /**
    * Initialize all dynamic elements in the renderer process
    */
  constructor () {
    this._currentFile = null
    this._currentDir = null
    this._paths = null
    this._lang = 'en_US' // Default fallback

    // Write translation data into renderer process's global var
    // Why do we have to stringify and parse it? Because otherwise the
    // renderer's global.i18n-variable will simply be a huge object calling
    // the main's IPC EVERY TIME it is accessed. Therefore, we take some more
    // time to copy it completely into the renderer's memory. It will take up
    // some time at the beginning, but as we are using an overlay either way
    // it's not gonna impact that much.
    global.i18n = JSON.parse(JSON.stringify(remote.getGlobal('i18n')))

    // Immediately add the operating system class to the body element to
    // enable the correct font-family.
    $('body').addClass(process.platform)

    // Init the complete list of objects that we need
    this._ipc = new ZettlrRendererIPC(this)
    this._directories = new ZettlrDirectories(this)
    this._preview = new ZettlrPreview(this)
    this._editor = new ZettlrEditor(this)
    this._body = new ZettlrBody(this)
    this._toolbar = new ZettlrToolbar(this)
    this._pomodoro = new ZettlrPomodoro(this)
    this._stats = new ZettlrStatsView(this)
    this._attachments = new ZettlrAttachments(this)

    this._directoriesLocked = false // Is the directory tree view currently locked?
    this._stateBeforeLocked = '' // Saves the state the combiner was in before lock was initialised, can be preview or directories
  }

  /**
    * Begin sending the first wave of messages to get info from main.
    * @return {void} Nothing to return.
    */
  init () {
    // We have to carve out the initial configuration of the renderer from the
    // first tick of the renderer event loop, because at this early stage (init
    // is called right after the DOM has loaded) the ipc is not yet ready. This
    // short delay gives us the time the IPC needs to get ready.
    setTimeout(() => { this.configChange() }, 10) // 10ms should suffice - the number is irrelevant. The important part is that it's out of the first tick of the app.

    // Receive an initial list of tags to display in the preview list
    this._ipc.send('get-tags')
    // Additionally, request the full database of already existing tags inside files.
    this._ipc.send('get-tags-database')

    // Request a first batch of files
    this._ipc.send('get-paths', {})

    // Here we can init actions and stuff to be done after the startup has finished
    setTimeout(() => { this.poll() }, POLL_TIME) // Poll every POLL_TIME seconds

    // Send an initial check for an update
    this._ipc.send('update-check')
  }

  /**
    * This function is called every POLL_TIME seconds to execute recurring tasks.
    */
  poll () {
    // The updating of both the IDs available for citation as well as updating
    // the citations of a whole book you may have written costs a lot of time,
    // we'll do this outside of the normal run of the application, every
    // POLL_TIME seconds. This way, it might feel "laggy", but after all the
    // writing itself does not seem laggy, and this is the main aim. Nobody can
    // seriously complain that the citations update "slowly".
    this._ipc.send('citeproc-get-ids')
    // Set next timeout
    setTimeout(() => { this.poll() }, POLL_TIME)
  }

  /**
    * The toolbar buttons trigger IPC event types. Therefore simply forward to
    * the IPC which in turn will call the corresponding events on this class.
    * @param  {String} cmd The command
    * @param  {Object} cnt The message's body
    * @return {void}     No return.
    */
  handleEvent (cmd, cnt) {
    this._ipc.handleEvent(cmd, cnt)
  }

  /**
   * This function is called by the IPC to indicate changes in the config that
   * have to be applied in the renderer. It will fetch all config variables
   * and apply them.
   */
  configChange () {
    // Set dark theme
    this.darkTheme(global.config.get('darkTheme'))
    // Set snippets
    this.getPreview().snippets(global.config.get('snippets'))
    // Receive the application language
    this.setLocale(global.config.get('app_lang'))
    // muteLines initial setting
    this.getEditor().setMuteLines(global.config.get('muteLines'))
    this.getEditor().setAutoCloseBrackets(global.config.get('editor.autoCloseBrackets'))
    // preview image constraints
    this.getEditor().setImagePreviewConstraints(
      global.config.get('display.imageWidth'),
      global.config.get('display.imageHeight')
    )

    // Set the correct combiner state
    switch (global.config.get('combinerState')) {
      case 'expanded':
        $('#editor').addClass('collapsed')
        $('#combiner').addClass('expanded')
        break
      case 'collapsed':
        $('#editor').removeClass('collapsed')
        $('#combiner').removeClass('expanded')
        break
    }

    // And last but not least the zkn options
    this.getEditor().getEditor().setOption('zkn', global.config.get('zkn'))
  }

  /**
    * Requests the renaming of either the current or another directory.
    * @param  {Object} arg Message body
    * @return {void}     No return.
    */
  renameDir (arg) {
    if (arg.hasOwnProperty('hash')) {
      // Another dir should be renamed
      // Rename a dir based on a hash -> find it
      this._body.requestNewDirName(this.findObject(arg.hash))
    } else if (this.getCurrentDir() != null) {
      this._body.requestNewDirName(this.getCurrentDir())
    }
  }

  /**
    * Displays the popup for a new directory name.
    * @param  {Object} arg Contains the containing dir's hash
    * @return {void}     No return.
    */
  newDir (arg) {
    // User wants to create a new directory. Display modal
    if (arg.hasOwnProperty('hash')) {
      // User has probably right clicked
      this._body.requestDirName(this.findObject(arg.hash))
    } else {
      this._body.requestDirName(this.getCurrentDir())
    }
  }

  /**
    * Tells the ZettlrBody to request a new virtualdir name
    * @param  {Object} arg Contains the parent dir's hash
    */
  newVirtualDir (arg) {
    if (arg.hasOwnProperty('hash')) {
      this._body.requestVirtualDirName(this.findObject(arg.hash))
    } else if (this.getCurrentDir().type === 'directory') { // Only add vds to normal directories
      this._body.requestVirtualDirName(this.getCurrentDir())
    }
  }

  /**
    * The user wants to delete a directory
    * @param  {Object} arg Contains the hash (or none)
    * @return {void}     No return.
    */
  deleteDir (arg) {
    // The user has requested to delete the current file
    // Request from main process
    if (arg.hasOwnProperty('hash')) {
      this._ipc.send('dir-delete', { 'hash': arg.hash })
    } else {
      this._ipc.send('dir-delete', {})
    }
  }

  /**
   * Set the dark theme of the app based upon the value of val.
   * @param  {Boolean} val Whether or not we should enable the dark theme.
   */
  darkTheme (val) {
    this._body.darkTheme(val)
  }

  /**
    * Toggle the display of the directory pane.
    * @return {void} No return.
    */
  toggleCombiner () {
    $('#combiner').hide() // bruh
    this._editor.toggleCombiner() // Need a better name for this thing. Definitely.
  }

  /**
    * Toggles display of the attachment pane.
    */
  toggleAttachments () {
    this._attachments.toggle()
  }

  /**
    * Displays a table of content.
    * @return {void} (Point of) No return.
    */
  toc () {
    if (this.getCurrentFile() === null) {
      return
    }

    let toc = this._editor.buildTOC()

    if (toc.length === 0) {
      return
    }

    let cnt = $('<div>')
    let h1 = 0
    let h2 = 0
    let h3 = 0
    let h4 = 0
    let h5 = 0
    let h6 = 0
    for (let entry of toc) {
      let level = ''
      switch (entry.level) {
        case 1:
          h1++
          h2 = h3 = h4 = h5 = h6 = 0
          level = h1
          break
        case 2:
          h2++
          h3 = h4 = h5 = h6 = 0
          level = [h1, h2].join('.')
          break
        case 3:
          h3++
          h4 = h5 = h6 = 0
          level = [h1, h2, h3].join('.')
          break
        case 4:
          h4++
          h5 = h6 = 0
          level = [h1, h2, h3, h4].join('.')
          break
        case 5:
          h5++
          h6 = 0
          level = [h1, h2, h3, h4, h5].join('.')
          break
        case 6:
          h6++
          level = [h1, h2, h3, h4, h5, h6].join('.')
      }

      cnt.append(
        $('<a>').text(level + '. ' + entry.text)
          .attr('data-line', entry.line)
          .attr('href', '#')
          .addClass('toc-link')
      )
    }

    popup($('.button.show-toc'), cnt)

    // On click jump to line
    $('.toc-link').click((event) => {
      let elem = $(event.target)
      this._editor.jtl(elem.attr('data-line'))
    })
  }

  /**
    * Tries to find a given hash in all open directories and files
    * @param  {Number} hash The hash to be searched for
    * @return {Object}      Either a file or a directory object
    */
  findObject (hash) {
    let o = null
    for (let p of this._paths) {
      o = this._find(hash, p)
      if (o != null) {
        break
      }
    }

    return o
  }

  /**
    * Helper function to find dummy file/dir objects based on a hash
    * @param  {Integer} hash             The hash identifying whatever is to be searched for.
    * @param  {Object} [obj=this._paths] A sub-object or the whole tree to be searched.
    * @return {Mixed}                  Either null, or ZettlrFile/ZettlrDir if found.
    */
  _find (hash, obj = this._paths) {
    if (parseInt(obj.hash) === parseInt(hash)) {
      return obj
    } else if (obj.hasOwnProperty('children')) {
      for (let c of obj.children) {
        let ret = this._find(hash, c)
        if (ret != null) {
          return ret
        }
      }
    }
    return null
  }

  /**
    * A new paths object came from main process. This function replaces the
    * renderer's and re-sets current's pointers.
    * @param  {Object} nData The new file tree
    * @return {void}       Nothing to return.
    */
  refresh (nData) {
    this._paths = nData
    if (this.getCurrentDir() != null) {
      this.setCurrentDir(this.getCurrentDir().hash)
    } else {
      this.setCurrentDir(null) // Reset
    }
    if (this.getCurrentFile() != null) {
      this.setCurrentFile(this.getCurrentFile().hash)
    } else {
      this.setCurrentFile(null)
    }

    // Trigger a refresh in directories and preview and attachment pane
    this._directories.refresh()
    this._preview.refresh()
    this._attachments.refresh()
  }

  /**
    * Replaces the current file with a new version after a save.
    * @param  {ZettlrFile} file The new file object.
    */
  refreshCurrentFile (file) {
    if (this.getCurrentFile()) {
      // The only things that could've changed and that are immediately
      // visible to the user (which is why we need to update them) are:
      // modtime, snippet, tags, id. The rest can wait until the next big
      // update.
      let f = this.getCurrentFile()
      f.modtime = file.modtime
      f.tags = file.tags
      f.id = file.id
      // Trigger a redraw of this specific file in the preview list.
      this._preview.refresh()
    }
  }

  /**
    * Replaces a file after the name has changed (or it has been moved)
    * @param  {Number} oldHash The old hash
    * @param  {ZettlrFile} file    The new file to replace the old.
    */
  replaceFile (oldHash, file) {
    if (!file) {
      return // No file given; main has screwed up
    }

    let oldFile = this.findObject(oldHash)

    if (oldFile && oldFile.type === 'file') {
      // Apply all necessary properties
      oldFile.dir = file.dir
      oldFile.name = file.name
      oldFile.path = file.path
      oldFile.hash = file.hash
      oldFile.id = file.id
      oldFile.tags = file.tags
      oldFile.ext = file.ext
      oldFile.modtime = file.modtime

      // Then refresh
      this._preview.refresh()
      this._directories.refresh()
    }
  }

  // SEARCH FUNCTIONS
  // This class only acts as a pass-through

  /**
   * This function can be used to programmatically start a global search. It
   * takes care that the toolbar shows the correct search term and that the
   * search is initiated.
   * @param  {String} term A term in string form
   * @return {ZettlrRenderer} This for chainability.
   */
  triggerGlobalSearch (term) {
    this._toolbar.setSearch(term)
    this.beginSearch(term)
    return this
  }

  /**
   * This function is called by ZettlrToolbar. The term gets passed on to
   * ZettlrPreview, but also a force-open event is sent to main, in case there
   * is a file that completely matches the file name.
   * @param  {String} term The term to be searched for.
   * @return {void}      Nothing to return.
   */
  beginSearch (term) {
    // Show preview before searching the dir
    this.showPreview()
    this._ipc.send('force-open', term)
    this._preview.beginSearch(term)
  }

  /**
   * Initiates an auto-search that either directly opens a file (forceOpen=true)
   * or simply automatically searches for something and displays the results.
   * @param  {String} term The content of the Wikilink or Tag that has been clicked
   * @param {Boolean} [forceOpen=false] If true, Zettlr will directly open the file
   */
  autoSearch (term, forceOpen = false) {
    if (!forceOpen) {
      // Insert the term into the search field and commence search.
      this._toolbar.setSearch(term)
      this.beginSearch(term)
    } else {
      // Show preview before searching the dir
      this.showPreview()
      // Don't search, simply tell main to open the file
      this._ipc.send('force-open', term)
      // Also initiate a search to be run accordingly for any files that
      // might reference the file.
      this._toolbar.setSearch(term)
      this.beginSearch(term)
    }
  }

  /**
   * Pass-through function from ZettlrPreview to Toolbar.
   * @param  {Integer} curIndex Current searched file
   * @param  {Integer} count    Absolute count of files to search.
   * @return {void}          Nothing to return.
   */
  searchProgress (curIndex, count) { this._toolbar.searchProgress(curIndex, count) }

  /**
   * Pass-through function from ZettlrPreview to Toolbar.
   * @return {void} Nothing to return.
   */
  endSearch () {
    this._toolbar.endSearch()
    this._preview.endSearch()
  }

  // END search functions

  /**
   * Handles a list of files and directories dropped onto the app.
   * @param  {Array} filelist An array containing all paths.
   */
  handleDrop (filelist) {
    this._ipc.send('handle-drop', filelist)
  }

  /**
   * Pass-through function from ZettlrEditor to ZettlrToolbar.
   * @param  {Integer} words Number of words in editor.
   * @return {void}       Nothing to return.
   */
  updateWordCount (words) { this._toolbar.updateWordCount(words) }

  /**
   * Request the selection of the directory in main.
   * @param  {Integer} hash As usually, a hash identifying a directory.
   * @return {void}      Nothing to return.
   */
  requestDir (hash) {
    // Only request a new directory if it is about to be changed.
    if (this.getCurrentDir() == null || this.getCurrentDir().hash !== parseInt(hash)) {
      this._ipc.send('dir-select', hash)
    } else {
      // Otherwise, the user simply has clicked on the dir again to show
      // the preview list.
      this.showPreview()
    }
  }

  /**
   * Triggered when a file or dir is dropped on a dir.
   * @param  {Integer} from Hash of the source file/dir.
   * @param  {Integer} to   Where to move? (Hash)
   * @return {void}      Nothing to return.
   */
  requestMove (from, to) { this._ipc.send('request-move', { 'from': from, 'to': to }) }

  /**
   * Requests the opening of another file in editor.
   * @param  {Integer} hash The hash of the file to be loaded.
   * @return {void}      Nothing to return.
   */
  requestFile (hash) { this._ipc.send('file-get', hash) }

  /**
   * Tells the main to tell the directory to sort itself
   * @param  {Number} hash The hash of the directory to be sorted
   * @param  {String} type Either time or name
   */
  sortDir (hash, type) { this._ipc.send('dir-sort', { 'hash': hash, 'type': type }) }

  /**
   * Executed when a user has finished typing a new file name.
   * @param  {String} name The new name
   * @param  {Integer} hash The containing dir's hash
   * @return {void}      Nothing to return.
   */
  requestNewFile (name, hash) { this._ipc.send('file-new', { 'name': name, 'hash': hash }) }

  /**
   * Executed when a user has finished typing a new dir name.
   * @param  {String} name The new name
   * @param  {Integer} hash The containing dir's hash
   * @return {void}      Nothing to return.
   */
  requestNewDir (name, hash) { this._ipc.send('dir-new', { 'name': name, 'hash': hash }) }

  /**
   * Executed when a user has finished typing a new virtual directory name.
   * @param  {String} name The virtual directory's name
   * @param  {Integer} hash The parent directory's hash
   * @return {void}      No return.
   */
  requestNewVirtualDir (name, hash) { this._ipc.send('dir-new-vd', { 'name': name, 'hash': hash }) }

  /**
   * Executed when the user clicks on a filetype to export to.
   * @param  {Integer} hash The hash of the file to be exported
   * @param  {String} ext  Either "odt", "docx", "html" or "pdf".
   * @return {void}      Nothing to return.
   */
  requestExport (hash, ext) { this._ipc.send('export', { 'hash': hash, 'ext': ext }) }

  /**
   * Requests a rename of a directory.
   * @param  {String} val  The new name.
   * @param  {Integer} hash The directory's identifier.
   * @return {void}      Nothing to return.
   */
  requestDirRename (val, hash) { this._ipc.send('dir-rename', { 'hash': hash, 'name': val }) }

  /**
   * Request a rename of a file.
   * @param  {String} val  The new name
   * @param  {Integer} hash The identifier of the file.
   * @return {void}      Nothing to return.
   */
  requestFileRename (val, hash) { this._ipc.send('file-rename', { 'hash': hash, 'name': val }) }

  /**
   * Called by the dialog when the user saves the settings.
   * @param  {Object} cfg A correct configuration object to be sent to main.
   * @return {void}     Nothing to return.
   */
  saveSettings (cfg) { this._ipc.send('update-config', cfg) }

  /**
   * Called by the dialog when the user saves the settings.
   * @param  {Object} cfg An object to be sent to main, containing properties and hash attributes.
   * @return {void}     Nothing to return.
   */
  saveProjectSettings (cfg) { this._ipc.send('update-project-properties', cfg) }

  /**
   * Sends the new tag-object to main.
   * @param  {Object} tags The tags to be sent
   */
  saveTags (tags) { this._ipc.send('update-tags', tags) }

  /**
   * Opens a new file
   * @param  {ZettlrFile} f The file to be opened
   */
  openFile (f) {
    // We have received a new file. So close the old and open the new
    this._editor.close()
    // Select the file either in the preview list or in the directory tree
    // this._preview.select(f.hash);
    this._editor.open(f)
    this._body.addRecentDocument(f)
  }

  /**
   * Closes the current file
   */
  closeFile () {
    // We have received a close-file command.
    this._editor.close()
  }

  /**
   * Saves the current file
   */
  saveFile () {
    // The user wants to save the currently opened file.
    let file = this.getCurrentFile()
    if (file == null) {
      // User wants to save an untitled file
      // Important: The main Zettlr-class expects hash to be null
      // for new files
      file = {}
    }
    file.content = this._editor.getValue()
    file.wordcount = this._editor.getWrittenWords() // For statistical purposes only =D
    this._ipc.send('file-save', file)
  }

  /**
   * Request the renaming of a file
   * @param  {ZettlrFile} f The file, whose name should be changed
   */
  renameFile (f) {
    if (f.hasOwnProperty('hash')) {
      // Make sure preview is visible for this to work correctly
      this.showPreview()
      // Another file should be renamed
      // Rename a file based on a hash -> find it
      this._body.requestNewFileName(this.findObject(f.hash))
    } else if (this.getCurrentFile() != null) {
      this._body.requestNewFileName(this.getCurrentFile())
    }
  }

  /**
   * Create a new file.
   * @param  {ZettlrDir} d Contains a directory in which the file should be created
   */
  newFile (d) {
    // User wants to create a new file. Display popup
    if ((d != null) && d.hasOwnProperty('hash')) {
      // User has probably right clicked
      this._body.requestFileName(this.findObject(d.hash))
    } else {
      this._body.requestFileName(this.getCurrentDir())
    }
  }

  /**
   * Exits the search, i.e. resets everything back to what it looked like.
   */
  exitSearch () {
    this._preview.showFiles()
    this._editor.unmarkResults()
  }

  /**
   * Sets the current dir pointer to the new.
   * @param {ZettlrDir} newdir The new dir.
   */
  setCurrentDir (newdir = null) {
    let oldDir = this._currentDir
    this._currentDir = this.findObject(newdir) // Find the dir (hash) in our own paths object
    this._attachments.refresh()

    if (this._currentDir != null) {
      // What we can also do here: Select the dir and refresh the file list.
      // Because that's what _always_ follows this function call.
      this._directories.select(newdir)
      if ((oldDir != null) && (oldDir.path !== newdir.path)) {
        // End (potential) displaying of file results. showFiles() also refreshes.
        this.exitSearch()
      } else {
        // Else don't exit the search
        this._preview.refresh()
      }

      if (this.getCurrentFile()) {
        // Necessary to scroll the file into view
        this._preview.select(this.getCurrentFile().hash)
      }
      if (oldDir == null || this._currentDir.hash !== oldDir.hash) {
        this.showPreview()
      } // Else stay where we are
    } else {
      this.showDirectories()
    }
  }

  /**
   * Simply sets the current file pointer to the new.
   * @param {Number} newHash The new file's hash.
   */
  setCurrentFile (newHash) {
    this._currentFile = this.findObject(newHash)
    // Also directly select it
    if (this._currentFile !== null) {
      this._preview.select(newHash)
      this._directories.select(newHash)
    }
  }

  /**
   * Returns the current file's pointer.
   * @return {ZettlrFile} The file object.
   */
  getCurrentFile () { return this._currentFile }

  /**
   * Returns the current directory's pointer.
   * @return {ZettlrDir} The dir object.
   */
  getCurrentDir () { return this._currentDir }

  /**
   * Returns the language of the GUI.
   * @return {String} The language code.
   */
  getLocale () { return this._lang }

  /**
   * Sets the GUI language
   * @param {String} lang locale code
   */
  setLocale (lang) { this._lang = lang }

  /**
   * Returns the toolbar object
   * @return {ZettlrToolbar} The current toolbar
   */
  getToolbar () { return this._toolbar }

  /**
   * Returns the editor object
   * @return {ZettlrEditor} The editor instance
   */
  getEditor () { return this._editor }

  /**
   * Returns the preview object
   * @return {ZettlrPreview} The preview list
   */
  getPreview () { return this._preview }

  /**
   * Returns the directories object
   * @return {ZettlrDirectories} The directory object
   */
  getDirectories () { return this._directories }

  /**
   * Returns the body object
   * @return {ZettlrBody} The body instance
   */
  getBody () { return this._body }

  /**
   * Returns the pomodoro
   * @return {ZettlrPomodoro} The pomodoro object
   */
  getPomodoro () { return this._pomodoro }

  /**
   * Returns the current paths
   * @return {Object} The paths object
   */
  getPaths () { return this._paths }

  /**
   * Returns the stats view
   * @return {ZettlrStatsView} The view instance
   */
  getStatsView () { return this._stats }

  /**
   * Returns a one-dimensional array of all files in the current directory and
   * its subdirectories. The extensions are omitted!
   * @param  {Object} [obj=this.getCurrentDir()] The object to be searched in.
   * @param  {Array}  [arr=[]]                   The array containing file names
   * @return {Array}                            The array containing all file names
   */
  getFilesInDirectory (obj = this.getCurrentDir(), arr = []) {
    if (!obj) return arr

    if (obj.type === 'directory') {
      for (let child of obj.children) {
        if (child.type === 'file') {
          arr.push(path.basename(child.name, path.extname(child.name)))
        } else if (child.type === 'directory') {
          arr = this.getFilesInDirectory(child, arr)
        }
      }
    } else if (obj.type === 'file') {
      arr.push(path.basename(obj.name, path.extname(obj.name)))
    }

    return arr
  }

  /**
   * Shows directory pane in combiner
   */
  showDirectories () {
    this._preview.hide()
    this._directories.show()
  }

  /**
   * Shows preview in combiner
   */
  showPreview () {
    if (this._directoriesLocked) {
      return // Can't show the preview pane
    }
    this._preview.show()
    this._directories.hide()
  }

  /**
   * Lock the directories so that preview won't show up
   */
  lockDirectories () {
    this._directoriesLocked = true
    // Get previous state
    this._stateBeforeLocked = ($('#preview').hasClass('hidden')) ? 'directories' : 'preview'
    // Also make sure directories are shown
    this.showDirectories()
  }

  /**
     * Unlocks the directory pane, e.g. preview can be shown again
     */
  unlockDirectories () {
    this._directoriesLocked = false
    // Restore preview, if it was shown before the directories were locked.
    if (this._stateBeforeLocked === 'preview') {
      this.showPreview()
    }
  }

  /**
   * Sends a command to Main (only used in ZettlrPreview for searching)
   * @param  {String} command The command to be sent
   * @param  {Mixed} [content={}] The content belonging to the sent command, can be empty
   */
  send (command, content = {}) { this._ipc.send(command, content) }

  /**
   * Updates the list of IDs available for autocomplete
   * @param {Array} idList An array containing all available IDs.
   */
  setCiteprocIDs (idList) { this._editor.setCiteprocIDs(idList) }

  /**
   * Gets called whenever a new bibliography comes from main, and we need to
   * update it here.
   * @param {Object} bib A new citeproc bibliography object.
   */
  setBibliography (bib) { this._attachments.refreshBibliography(bib) }

  /**
   * Simply indicates to main to set the modified flag.
   */
  setModified () { this._ipc.send('file-modified', {}) }

  /**
   * Can tell whether or not the editor is modified.
   * @return {Boolean} True if the editor's contents are modified.
   */
  isModified () { return !this.getEditor().isClean() }
} // END CLASS

module.exports = ZettlrRenderer
