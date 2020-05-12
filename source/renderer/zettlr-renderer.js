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

const ZettlrRendererIPC = require('./zettlr-rendereripc')
const ZettlrEditor = require('./zettlr-editor')
const ZettlrBody = require('./zettlr-body')
const ZettlrToolbar = require('./zettlr-toolbar')
const ZettlrPomodoro = require('./zettlr-pomodoro')
const ZettlrAttachments = require('./zettlr-attachments')
const GlobalSearch = require('./util/global-search')

const ZettlrStore = require('./zettlr-store')
const createSidebar = require('./assets/vue/vue-sidebar')

const { remote, shell, clipboard } = require('electron')

const generateId = require('../common/util/generate-id')
const loadI18nRenderer = require('../common/lang/load-i18n-renderer')

const reconstruct = require('./util/reconstruct-tree')

const loadicons = require('./util/load-icons')

const path = require('path')

// Pull the poll-time from the data
const POLL_TIME = require('../common/data.json').poll_time

/**
 * This is the pendant class to the Zettlr class in the main process. It mirrors
 * the functionality of the main process, only that the functionality in here
 * is connected with the rendering, not with the reading of files, etc.
 */
class ZettlrRenderer {
  /**
    * Initialize all dynamic elements in the renderer process
    */
  constructor () {
    this._currentFile = null
    this._currentDir = null
    this._paths = null
    this._lang = 'en-US' // Default fallback

    // Stores the current global search in order to access it.
    this._currentSearch = null

    // Write translation data into renderer process's global var
    loadI18nRenderer()

    // Immediately add the operating system class to the body element to
    // enable the correct font-family.
    $('body').addClass(process.platform)

    // Init the complete list of objects that we need
    this._ipc = new ZettlrRendererIPC(this)
    this._editor = new ZettlrEditor(this)
    this._body = new ZettlrBody(this)
    this._toolbar = new ZettlrToolbar(this)
    this._pomodoro = new ZettlrPomodoro(this)
    this._attachments = new ZettlrAttachments(this)
    // Create and mount the sidebar
    this._sidebar = createSidebar()
    // Create the store wrapper which will act as
    // a unifying interface to commit changes to the store.
    this._store = new ZettlrStore(this, this._sidebar.$store)

    // Add a few convenience functions
    global.application = {
      globalSearch: (term) => {
        // Initiate a global search
        this._toolbar.setSearch(term)
        this.beginSearch(term)
      }
    }
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

    // Requesting the CSS file path obviously also needs to be out of the first
    // tick.
    setTimeout(() => {
      // 10ms should suffice - the number is irrelevant. The important part is
      // that it's out of the first tick of the app.
      this.configChange()

      // Apply the custom CSS stylesheet to the head element
      global.ipc.send('get-custom-css-path', {}, (ret) => {
        let lnk = $('<link>').attr('rel', 'stylesheet')
        lnk.attr('href', 'file://' + ret + '?' + Date.now())
        lnk.attr('type', 'text/css')
        lnk.attr('id', 'custom-css-link')
        $('head').first().append(lnk)
      })

      // Receive an initial list of tags to display in the preview list
      this._ipc.send('get-tags')
      // Additionally, request the full database of already existing tags inside files.
      this._ipc.send('get-tags-database')

      // Request a first batch of files
      this._ipc.send('get-paths')

      // Send an initial request to the reference database.
      this._ipc.send('citeproc-get-ids')

      // Send an initial check for an update
      this._ipc.send('update-check')
    }, 100)

    // Here we can init actions and stuff to be done after the startup has finished
    setTimeout(() => { this.poll() }, POLL_TIME) // Poll every POLL_TIME seconds

    // Load the clarity icon modules, add custom icons and then refresh
    // attachments (because it requires custom icons to be loaded).
    setTimeout(() => loadicons().then(() => this._attachments.refresh()), 0)
  }

  /**
    * This function is called every POLL_TIME seconds to execute recurring tasks.
    */
  poll () {
    // Nothing to do currently

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
    // Set file meta
    global.store.set('fileMeta', global.config.get('fileMeta'))
    global.store.set('hideDirs', global.config.get('hideDirs')) // TODO: Not yet implemented
    global.store.set('displayTime', global.config.get('fileMetaTime'))
    global.store.set('sidebarMode', global.config.get('sidebarMode'))
    // Receive the application language
    this.setLocale(global.config.get('appLang'))

    // Tell the body that the config has changed
    this.getBody().configChange()

    // Tell the editor that the config has changed
    this.getEditor().configChange()
  }

  /**
   * Generates an ID based upon the configured pattern, writes it into the
   * clipboard and then triggers the paste command on these webcontents.
   * @return {void} Does not return.
   */
  genId () {
    // First we need to backup the existing clipboard contents
    // so that they are not lost during the operation.
    let text = clipboard.readText()
    let html = clipboard.readHTML()
    let image = clipboard.readImage()
    let rtf = clipboard.readRTF()

    // Write an ID to the clipboard
    clipboard.writeText(generateId(global.config.get('zkn.idGen')))
    // Paste the ID
    remote.getCurrentWebContents().paste()

    // Now restore the clipboard's original contents
    setTimeout((e) => {
      clipboard.write({
        'text': text,
        'html': html,
        'image': image,
        'rtf': rtf
      })
    }, 10) // Why do a timeout? Because the paste event is asynchronous.
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
    * Tries to find a given hash in all open directories and files
    * @param  {Number} hash The hash to be searched for
    * @return {Object}      Either a file or a directory object
    */
  findObject (hash) {
    for (let p of this._paths) {
      let o = this._find(hash, p)
      if (o != null) return o
    }

    return null
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
        if (ret != null) return ret
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
    // First we have to "reconstruct" the circular structure
    // of the directory tree. This function replaces each
    // parent-prop (only a hash) with the corresponding tree
    // object, so that we have in principle the same structure
    // than in main.
    reconstruct(nData)
    this._paths = nData
    if (this.getCurrentDir() != null) {
      this.setCurrentDir(this.getCurrentDir().hash)
    } else {
      this.setCurrentDir(null) // Reset
    }

    // Trigger a refresh in the attachment pane
    this._attachments.refresh()

    // Pass on the new paths object as is to the store.
    global.store.renewItems(nData)

    // Finally, synchronize the file descriptors in the editor
    this._editor.syncFiles()
  }

  /**
    * Replaces the current file with a new version after a save.
    * @param  {ZettlrFile} file The new file object.
    */
  refreshCurrentFile (file) {
    if (this.getActiveFile()) {
      // The only things that could've changed and that are immediately
      // visible to the user (which is why we need to update them) are:
      // modtime, file meta, tags, id. The rest can wait until the next big
      // update.
      let f = this.getActiveFile()
      f.modtime = file.modtime
      f.tags = file.tags
      f.wordCount = file.wordCount
      f.charCount = file.charCount
      f.target = file.target
      f.id = file.id
      // Trigger a redraw of this specific file in the preview list.
      this._preview.refresh()

      // Finally, synchronize the file descriptors in the editor
      this._editor.syncFiles()
    }
  }

  /**
    * Replaces a file after the name has changed (or it has been moved)
    * @param  {Number} oldHash The old hash
    * @param  {ZettlrFile} file    The new file to replace the old.
    */
  replaceFile (oldHash, file) {
    console.log('replacing file', file)
    if (!file) return // No file given; main has screwed up

    let oldFile = this.findObject(oldHash)

    if (oldFile && oldFile.type === 'file') {
      // We'll be patching the store, as this will
      // be reflected in renderer._paths as well.
      global.store.patch(oldHash, file)
      console.warn('replacing file', file)

      // Finally, synchronize the file descriptors in the editor
      this._editor.syncFiles()
    }
  }

  /**
    * Replaces a directory after the name has changed (or it has been moved)
    * @param  {Number} oldHash The old hash
    * @param  {ZettlrDir} dir    The new dir to replace the old.
    */
  replaceDir (oldHash, dir) {
    if (!dir) return // No file given; main has screwed up

    let oldDir = this.findObject(oldHash)

    if (oldDir && oldDir.type === 'directory') {
      // We'll be patching the store, as this
      // will also update the renderer._paths.
      global.store.patch(oldHash, dir)
      this._attachments.refresh()
    }
  }

  // SEARCH FUNCTIONS
  // This class only acts as a pass-through

  /**
   * This function is called by ZettlrToolbar. The term gets passed on to
   * ZettlrPreview, but also a force-open event is sent to main, in case there
   * is a file that completely matches the file name.
   * @param  {String} term The term to be searched for.
   * @return {void}      Nothing to return.
   */
  beginSearch (term) {
    // If there is a search running, set the interrupt flag
    if (this._currentSearch) this._currentSearch.setInterrupt()

    // First end any search in the store, if applicable.
    global.store.commitEndSearch()

    // Immediately send out a force-open command to see if a file matches
    this._ipc.send('force-open', term)

    // Make sure the file list is visible
    if (!this._sidebar.isFileListVisible()) this._sidebar.toggleFileList()

    // Now perform the actual search. For this we'll create a new search
    // object and pass all necessary data to it.
    let dirContents = this._store.getVuex().getters.currentDirectoryContent
    this._currentSearch = new GlobalSearch(term)
    this._currentSearch.with(
      // Filter by file and then only retain the hashes
      dirContents.filter(elem => elem.type === 'file').map(elem => elem.hash)
    ).each((elem, compiledSearchTerms) => {
      return new Promise((resolve, reject) => {
        // Send a request to the main process and handle it afterwards.
        global.ipc.send('file-search', {
          'hash': elem,
          'terms': compiledSearchTerms
        })

        // Now listen for the return
        global.ipc.once('file-search-result', (data) => {
          // Once the data comes back from main, resolve the promise
          resolve(data)
          // Also commit the search result to the store
          global.store.commitSearchResult(data)
        })
      })
    }).afterEach((count, total) => {
      this.searchProgress(count, total)
    }).then((res) => {
      // Indicate no results, if applicable.
      if (res.length === 0) global.store.emptySearchResult()
      // Mark the results in the potential open file
      global.editorSearch.markResults(this.getActiveFile())
      this._toolbar.endSearch() // Mark the search as finished
    }).start()
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
   * Exits the search, i.e. resets everything back to what it looked like.
   */
  exitSearch () {
    global.store.commitEndSearch()
    global.editorSearch.unmarkResults()
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
   * @param  {Object} fileInfo fileInfo object.
   * @return {void}       Nothing to return.
   */
  updateFileInfo (fileInfo) { this._toolbar.updateFileInfo(fileInfo) }

  /**
   * Opens a new file
   * @param  {ZettlrFile} f The file to be opened
   */
  openFile (f) {
    let flag = null
    if (f.hasOwnProperty('flag')) {
      // We have a flag, so we need to extract the file
      flag = f.flag
      f = f.file
    }
    // We have received a new file. So close the old and open the new
    // Select the file either in the preview list or in the directory tree
    global.store.set('selectedFile', f.hash)
    this._editor.open(f, flag)
  }

  /**
   * Closes the current file
   * @param {number} hash The hash of the file to be closed.
   */
  closeFile (hash = null) {
    // We have received a close-file command.
    this._editor.close(hash)
  }

  /**
   * Saves the current file
   */
  saveFile () {
    if (!this.isModified()) return // No need to save

    // The user wants to save the currently opened file.
    let file = this.getActiveFile()
    if (file == null) {
      // User wants to save an untitled file
      // Important: The main Zettlr-class expects hash to be null
      // for new files
      file = {}
    }
    file.content = this._editor.getValue()
    file.wordcount = this._editor.getWrittenWords()
    this._ipc.send('file-save', file)
  }

  /**
   * Request the renaming of a file
   * @param  {ZettlrFile} f The file, whose name should be changed
   */
  renameFile (f) {
    if (f.hasOwnProperty('hash')) {
      // Make sure preview is visible for this to work correctly
      // Another file should be renamed
      // Rename a file based on a hash -> find it
      this._body.requestNewFileName(this.findObject(f.hash))
    } else if (this.getActiveFile() != null) {
      this._body.requestNewFileName(this.getActiveFile())
    }
  }

  /**
   * Opens a file in the current directory or creates and opens if it doesn't exist.
   * @param {String} fileName A file name to either search for or create
   */
  openOrCreate (fileName) {
    let dirContents = this._store.getVuex().getters.currentDirectoryContent
    if (dirContents.length > 0) {
      let currentDir = dirContents[0]
      let dirFile = dirContents.find(elem => elem.type === 'file' && elem.name.replace(elem.ext, '') === fileName)
      if (!dirFile) {
        this._ipc.send('file-new', { name: fileName, hash: currentDir.hash })
      }

      this._ipc.send('force-open', fileName)
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
    } else if (d === 'new-file-button') {
      // The user has requested a new file from the new file button
      // on the tab bar - so let's display it there
      this._body.requestFileName(this.getCurrentDir(), 'new-file-button')
    } else {
      this._body.requestFileName(this.getCurrentDir())
    }
  }

  /**
   * Shows a given file in finder/explorer/file browser.
   * @param {Number} hash The file's hash
   */
  showInFinder (hash) {
    if (!hash) return
    let file = this.findObject(hash)

    if (!file || file.type !== 'file') return

    shell.showItemInFolder(file.path)
  }

  /**
   * Sets the current dir pointer to the new.
   * @param {ZettlrDir} newdir The new dir.
   */
  setCurrentDir (newdir = null) {
    this._currentDir = this.findObject(newdir) // Find the dir (hash) in our own paths object
    global.store.selectDirectory(newdir)
    this._attachments.refresh()
  }

  /**
   * Get the active file from the editor
   * @return {ZettlrFile} The file object.
   */
  getActiveFile () {
    let activeFile = this._editor.getActiveFile()
    if (!activeFile) return undefined
    // Don't return the editor's object (with all
    // content etc) but our own's without content!
    return this.findObject(activeFile.hash)
  }

  /**
   * Returns the current directory's pointer.
   * @return {ZettlrDir} The dir object.
   */
  getCurrentDir () { return this._currentDir }

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
   * Returns the sidebar component
   * @return {VueComponent} The sidebar
   */
  getSidebar () { return this._sidebar }

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
  setModified (hash) { this._ipc.send('file-modified', { 'hash': hash }) }

  /**
   * Instructs main to remove the edit flag.
   */
  clearModified (hash) { this._ipc.send('mark-clean', { 'hash': hash }) }

  /**
   * Can tell whether or not the editor is modified.
   * @return {Boolean} True if the editor's contents are modified.
   */
  isModified () { return !this.getEditor().isClean() }
} // END CLASS

module.exports = ZettlrRenderer
