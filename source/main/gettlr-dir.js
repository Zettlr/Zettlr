/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        GettlrDir class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the GettlrDir class, modeling a directory
 *                  on disk for the app.
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs')
const sanitize = require('sanitize-filename')
const GettlrFile = require('./gettlr-file.js')
const GettlrAttachment = require('./gettlr-attachment.js')
const GettlrProject = require('./gettlr-project.js')
const GettlrVirtualDirectory = require('./gettlr-virtual-directory.js')
const { shell } = require('electron')
const { trans } = require('../common/lang/i18n.js')
const onChange = require('on-change')

// Include helpers
const hash = require('../common/util/hash')
const sort = require('../common/util/sort')
const generateFileName = require('../common/util/generate-filename')
const ignoreDir = require('../common/util/ignore-dir')
const ignoreFile = require('../common/util/ignore-file')
const isFile = require('../common/util/is-file')
const isDir = require('../common/util/is-dir')
const isAttachment = require('../common/util/is-attachment')

const ALLOW_SORTS = [ 'name-up', 'name-down', 'time-up', 'time-down' ]
const FILETYPES = require('../common/data.json').filetypes

const SETTINGS_TEMPLATE = {
  sorting: 'name-up',
  virtualDirectories: [] // Empty array
}

/**
 * This class models properties and features of a directory on disk.
 */
class GettlrDir {
  /**
    * Read a directory.
    * @param {Mixed} parent     Either GettlrDir or Gettlr, depending on root status.
    * @param {String} dir      The full path to the directory
    */
  constructor (parent, dir) {
    if (dir === null || dir === '') {
      throw new Error('Error on GettlrDir instantiation: dir cannot be empty!')
    }

    // Prepopulate
    this.parent = parent
    this.path = dir
    this.name = path.basename(this.path)
    this.hash = hash(this.path)
    this.project = null // null, if this directory is not a project, and an instance of GettlrProject, if it is.
    this.children = []
    this.attachments = []
    this.type = 'directory'
    this.modtime = 0

    // Generate the settings, NOTE that we have to deep-copy the object.
    // We'll watch the settings object for changes so that we can automatically
    // save it once anything has been modified.
    this._settings = onChange(JSON.parse(JSON.stringify(SETTINGS_TEMPLATE)), this._onSettingsChangeHandler.bind(this))

    // The directory might've been just been created.
    try {
      fs.lstatSync(this.path)
    } catch (e) {
      // Error? -> create
      fs.mkdirSync(this.path)
    }

    if (this.isRoot()) {
      // We have to add our dir to the watchdog
      global.watchdog.addPath(this.path)
    }

    this._boundOnUnlinkDir = this.onUnlinkDir.bind(this)
    this._boundOnAdd = this.onAdd.bind(this)

    // Add the directory to the list of event receivers
    global.watchdog.on('unlinkDir', this._boundOnUnlinkDir)
    global.watchdog.on('add', this._boundOnAdd)
    global.watchdog.on('addDir', this._boundOnAdd)
  }

  _onSettingsChangeHandler (objPath, current, prev) {
    this._saveSettings() // We don't need to check the Promise
  }

  /**
   * DEBUG: Migrates the virtual directories from their old file into the main config file.
   * @return {void} Does not return.
   */
  _migrateSettings () {
    let vdPath = path.join(this.path, '.ztr-virtual-directories')
    if (!isFile(vdPath)) return

    let vds = JSON.parse(fs.readFileSync(vdPath, { encoding: 'utf8' }))
    if (vds.length === 0) return console.log('Not parsing the virtual Directories: Empty.')

    let newSettings = JSON.parse(JSON.stringify(SETTINGS_TEMPLATE))
    for (let virtualDir of vds) {
      console.log('    Parsing VD ' + virtualDir.name)
      let aliases = {}
      for (let file of virtualDir.files) {
        console.log('        Adding alias ' + file + '...')
        // Convert the paths to relatives (as this will be the standard in later use cases)
        aliases[path.basename(file, path.extname(file))] = path.relative(this.path, path.join(this.path, file))
      }
      newSettings.virtualDirectories.push({
        'name': virtualDir.name,
        'sorting': 'name-up',
        'aliases': aliases
      })
    }

    console.log('Saving retained virtual directories to disk ...')
    fs.writeFileSync(path.join(this.path, '.ztr-directory'), JSON.stringify(newSettings))
    // Also remove the now-obsolete file
    fs.unlinkSync(vdPath)
  }

  /**
    * Initiates a shutdown to all children
    */
  shutdown () {
    // Shutdown all objects
    for (let c of this.children) {
      c.shutdown()
    }

    if (this.project) this.project.save()

    // Also remove the listeners
    global.watchdog.off('unlinkDir', this._boundOnUnlinkDir)
    global.watchdog.off('add', this._boundOnAdd)
    global.watchdog.off('addDir', this._boundOnAdd)
  }

  /**
   * If this directory is removed, handle it.
   * @param  {string} p The path
   * @return {void}   No return.
   */
  onUnlinkDir (p) {
    // Only handle this-scopes
    if (this.isScope(p) !== this) return
    if (!this.isRoot()) {
      this.parent.notifyChange(trans('system.directory_removed', this.name))
      this.remove()
    } else {
      this.shutdown() // Need to remove the listeners
      this.parent.makeDead(this)
    }
  }

  onAdd (p) {
    if (this.isScope(p) !== true) return
    // A new dir or a new file has been created here. Re-Scan.
    if ((path.dirname(p) === this.path)) {
      this.scan().then(() => {
        global.application.dirUpdate(this.hash, this.getMetadata())
      })
    }
  }

  /**
    * Takes an object and returns a GettlrDir-object (or null)
    * @param  {Object} obj An object containing information for search
    * @return {Mixed}     Either null, if not found, or the GettlrDir object.
    */
  findDir (obj) {
    let prop

    if (obj.hasOwnProperty('path') && obj.path != null) {
      prop = 'path'
    } else if (obj.hasOwnProperty('hash') && obj.hash != null) {
      prop = 'hash'
    } else {
      throw new Error('Cannot search directory. Neither path nor hash given.')
    }

    if (this[prop] === obj[prop]) {
      return this
    } else {
      // Traverse the children
      for (let c of this.children) {
        let dir = c.findDir(obj)
        if (dir != null) return dir
      }
    }

    // Not found
    return null
  }

  /**
    * Finds a file in this directory
    * @param  {Object} obj An object containing information on the file.
    * @return {Mixed}     Either GettlrFile or null, if not found.
    */
  findFile (obj) {
    // Traverse the children
    for (let c of this.children) {
      let file = c.findFile(obj)
      if (file != null) return file
    }

    // Not found
    return null
  }

  /**
    * Either returns a file if the match is exact, or null
    * @param  {String} term The ID to be searched for
    * @return {GettlrFile}      GettlrFile or null.
    */
  findExact (term) {
    for (let c of this.children) {
      let file = c.findExact(term)
      if (file != null) return file
    }

    return null
  }

  /**
    * Creates a new subdirectory and returns it.
    * @param  {String} name The name (not path!) for the subdirectory.
    * @return {GettlrDir}      The newly created directory.
    */
  async newdir (name) {
    // Remove unallowed characters.
    name = sanitize(name, { replacement: '-' })
    if ((name === '') || (name === null)) {
      throw new Error(trans('system.error.no_allowed_chars'))
    }
    let newpath = path.join(this.path, name)

    // Ignore the add event in the watchdog.
    global.watchdog.ignoreNext('addDir', newpath)

    let dir = new GettlrDir(this, newpath)
    await dir.scan()
    this.children.push(dir)
    this.sort()

    // Return dir for chainability
    return dir
  }

  /**
    * Create a new file in this directory.
    * @param  {String} name The new name, if given
    * @return {GettlrFile}             The newly created file.
    */
  async newfile (name) {
    // Generate a unique new name
    if (name == null) name = generateFileName()

    name = sanitize(name, { replacement: '-' })
    // This gets executed once the user has not entered any allowed characters
    if ((name === '') || (name == null)) {
      throw new Error(trans('system.error.no_allowed_chars'))
    }

    // Do we have a valid extension?
    if (!FILETYPES.includes(path.extname(name))) name = name + '.md'

    // Already exists
    if (this.exists(path.join(this.path, name))) {
      throw new Error(trans('system.error.file_exists'))
    }

    // Ignore the creation event
    global.watchdog.ignoreNext('add', path.join(this.path, name))

    // Create a new file.
    let f = new GettlrFile(this, path.join(this.path, name))
    // We have to scan/read the file BEFORE sorting,
    // otherwise, time-based sorting doesn't work as
    // expected (modtime is still 0)
    await f.scan()
    this.children.push(f)
    this.sort()
    return f
  }

  /**
    * Duplicate a file from this directory.
    * @param  {Number} file The file's hash.
    * @param {String} name The new file's name.
    * @return {GettlrFile} The newly created file.
    */
  async duplicate (file, name) {
    // Generate a unique new name
    if (name == null) name = generateFileName()

    name = sanitize(name, { replacement: '-' })
    // This gets executed once the user has not entered any allowed characters
    if ((name === '') || (name == null)) {
      throw new Error(trans('system.error.no_allowed_chars'))
    }

    file = this.findFile({ 'hash': file })
    if (!file) throw new Error(trans('system.error.fnf_message'))

    // Do we have a valid extension?
    if (!FILETYPES.includes(path.extname(name))) name = name + '.md'

    // Already exists
    if (this.exists(path.join(this.path, name))) {
      throw new Error(trans('system.error.file_exists'))
    }

    // Ignore the creation event
    global.watchdog.ignoreNext('add', path.join(this.path, name))

    // Create a new file.
    let f = new GettlrFile(this, path.join(this.path, name))
    this.children.push(f)
    // Also immediately "save" the contents of the original file.
    f.save(file.read())
    this.sort()
    await f.scan()
    return f
  }

  /**
    * Returns the contents of a file identified by its hash
    * @param  {Integer} hash The file's hash
    * @return {Mixed}      Either a string containing the file's content or null.
    */
  get (hash) {
    // This function is supposed to return the file contents with the hash.
    // Let each children decide if they are correct.
    for (let c of this.children) {
      let cnt = c.get(hash)
      if (cnt != null) {
        // Got it -> return and abort.
        return cnt
      }
    }

    return null
  }

  /**
    * Removes either a child or this directory.
    * @param  {Mixed} [obj=this] Either GettlrDir or GettlrFile
    * @param {Boolean} [force=false] Should the directory itself be deleted as well?
    * @return {Boolean}            Whether or not the operation completed successfully.
    */
  remove (obj = this, force = false) {
    if (obj === this) {
      this.shutdown()

      // It may be that this method returns false. Mostly, because the
      // directory has been deleted and this object is only removed to
      // reflect changes on the disk that have been reported by chokidar
      if (force) shell.moveItemToTrash(this.path)
      this.parent.remove(this)
    } else {
      // Remove a file/virtual dir/dir (function was called by a children)
      let index = this.children.indexOf(obj)

      if (obj.isVirtualDirectory()) {
        // In this case we need to pluck it from the list of virtual directories
        let vd = this._settings.virtualDirectories.find(e => e.name === obj.name)
        if (vd) this._settings.virtualDirectories.splice(this._settings.virtualDirectories.indexOf(vd), 1)
      }

      // Should (normally) always be true
      if (index > -1) {
        this.children.splice(index, 1)
      } else {
        // Logically, this should never be executed. But who am I to tell
        // you about logic and software ...
        // Addendum Feb. 18th, 2020: The above comment just came true,
        // with projects: If you export a project, for a short amount
        // of time there's an intermediary file which is generated by
        // Gettlr, but obviously immediately removed. In that short
        // amount of time it is not possible for Gettlr to register and
        // add the new file, before removing it again, so it will indeed
        // not find that thing in the array again. So much for async code!
        // throw new Error('Could not find child inside array to remove!')
        global.log.error('Tried to remove non-existing children from directory', {
          'directory': this.name,
          'path': this.path,
          'wantedObject': obj.name || 'No object given'
        })
      }
    }

    return true
  }

  /**
    * Move (or rename) this directory. It's a double-use function
    * @param  {String} newpath     The new location of this dir
    * @param  {String} [name=null] A name, given when this should be renamed
    */
  async move (newpath, name = null) {
    // name will only be not-null if the dir should be renamed
    // If we move a directory, all files will automatically move.
    // So easiest way is to move this directory and then re-fetch
    // the children.
    if (name != null) {
      this.name = name // No need to detach on rename
      // But what we want to do is have the parent re-sort its children
      if (!this.isRoot()) this.parent.sort()
    }

    // Determine if this is just a rename or a move
    let rename = (newpath === path.dirname(this.path))

    // In *any case* we MUST shut down and remove the children.
    // They will be re-read.
    for (let c of this.children) c.shutdown()
    this.children = []
    this.attachments = []

    let oldPath = this.path
    this.path = path.join(newpath, this.name)
    this.hash = hash(this.path)

    // In case this dir is root, we have to replace its old path in the
    // config with the new path. Otherwise, this dir won't be retained on
    // restart of the app.
    if (this.isRoot()) {
      let openPaths = global.config.get('openPaths')
      for (let i = 0; i < openPaths.length; i++) {
        if (openPaths[i] === oldPath) {
          openPaths[i] = this.path
        }
      }
      global.config.set('openPaths', openPaths)
    }

    // Ignore both the unlink and the add event on the parent's directory
    global.watchdog.ignoreNext('unlinkDir', oldPath)
    global.watchdog.ignoreNext('addDir', this.path)

    // Move
    fs.renameSync(oldPath, this.path)

    // Detach from parent if not only renamed, because it's no longer in there
    if (!rename) this.detach()

    // Re-read
    await this.scan()
  }

  /**
    * Attach a new children to this element (mainly happens while moving)
    * @param  {Mixed} newchild GettlrDir or GettlrFile object
    * @return {GettlrDir}          This for chainability.
    */
  attach (newchild) {
    this.children.push(newchild)
    // Set the correct new parent
    newchild.parent = this
    this.sort()

    return this
  }

  /**
    * Detaches this directory from its parent.
    * @return {GettlrDir} This for chainability.
    */
  detach () {
    this.parent.remove(this)
    this.parent = null
    return this
  }

  /**
    * Scans the directory and adds all children that match the criteria (e.g.
    * dir or file permitted by filetypes)
    * @return {Promise} Resolve on successful loading
    */
  async scan () {
    // DEBUG for migrating virtual directories
    await this._migrateSettings()
    // (Re-)Reads this directory.
    await this._loadSettings() // Loads persisted settings on disk

    return new Promise((resolve, reject) => {
      try {
        let stat = fs.lstatSync(this.path)
        this.modtime = stat.mtime.getTime()
      } catch (e) {
        // Do not create directories here, only read.
        resolve()
      }

      // (Re-)read the directory
      fs.readdir(this.path, (err, files) => {
        if (err) reject(err)
        this.parseDirectoryContents(files).then(() => {
          this.loadVirtualDirectories() // Also load virtual directories
          resolve()
        })
      })
    })
  }

  /**
   * Parses the contents of the directory and fills it up with children as
   * appropriate.
   * @param  {Array}  files An array of all files and folders found in the dir.
   * @return {Promise}       Resolves after the tree has been parsed recursively.
   */
  async parseDirectoryContents (files) {
    // Convert to absolute paths
    for (let i = 0; i < files.length; i++) {
      files[i] = path.join(this.path, files[i])
    }

    // Remove all paths that are to be ignored
    for (let f of files) {
      if ((isDir(f) && ignoreDir(f)) || (isFile(f) && ignoreFile(f) && !isAttachment(f))) {
        files.splice(files.indexOf(f), 1)
      }
    }

    let nVirtualDirectories = []
    let nChildren = []
    let nAttachments = []

    // Remove all children that are no longer present
    for (let c of this.children) {
      // Hop over virtual directories.
      if (c.type === 'virtual-directory') {
        nVirtualDirectories.push(c)
        continue
      }
      if (!files.includes(c.path)) {
        c.shutdown()
        this.children.splice(this.children.indexOf(c), 1)
      }
    }

    // Iterate over all files
    for (let f of files) {
      // Do we already have it?
      let found = this.children.find((elem) => { return elem.path === f })
      let fattach = this.attachments.find((elem) => { return elem.path === f })
      if (found !== undefined || fattach !== undefined) {
        if (found) nChildren.push(found)
        if (fattach) nAttachments.push(fattach)
      } else {
        // Otherwise create new
        if (isFile(f) && !ignoreFile(f)) {
          let file = new GettlrFile(this, f)
          await file.scan() // Asynchronously parse the file
          nChildren.push(file)
        } else if (isDir(f) && !ignoreDir(f)) {
          let dir = new GettlrDir(this, f)
          await dir.scan() // Asynchronously parse the directory
          nChildren.push(dir)
        } else if (isAttachment(f)) {
          nAttachments.push(new GettlrAttachment(this, f))
        }
      }
    }

    // Add the virtual directories to the children's list
    this.children = nVirtualDirectories.concat(nChildren)
    this.attachments = nAttachments

    // Final step: Sort
    this.sort()
    this.attachments.sort((a, b) => {
      // Negative return: a is smaller b (case insensitive)
      if (a.name.toLowerCase() < b.name.toLowerCase()) {
        return -1
      } else if (a.name.toLowerCase() > b.name.toLowerCase()) {
        return 1
      } else {
        return 0
      }
    })

    // Last but not least check if we are a project
    if (GettlrProject.isProject(this)) this.makeProject()
  }

  /**
    * Creates a project for this directory.
    */
  makeProject () {
    if (!this.project) this.project = new GettlrProject(this)
  }

  /**
    * Removes the project from this dir.
    * @return {void} No return.
    */
  removeProject () {
    if (this.project) {
      this.project.remove()
      this.project = null
    }
  }

  /**
    * Returns the project.
    * @return {GettlrProject} The Gettlr Project instance, or null, if there is none.
    */
  getProject () { return this.project }

  /**
    * Toggles the sorting. Default is name-up
    * @param  {String} [type='name-up'] Can be an allowed sorting, or just time or name.
    * @return {GettlrDir}               Chainability
    */
  toggleSorting (type = 'name-up') {
    if (ALLOW_SORTS.includes(type)) {
      this._settings.sorting = type
    } else if (type.indexOf('name') > -1) {
      if (this._settings.sorting === 'name-up') {
        this._settings.sorting = 'name-down'
      } else {
        this._settings.sorting = 'name-up'
      }
    } else if (type.indexOf('time') > -1) {
      if (this._settings.sorting === 'time-up') {
        this._settings.sorting = 'time-down'
      } else {
        this._settings.sorting = 'time-up'
      }
    } else {
      this._settings.sorting = 'name-up'
    }

    // We do not need to persist the sorting, as the change-handler will
    // notice this and do it on his own.
    this.sort()
    return this
  }

  /**
    * Returns true, if the given path exists somewhere in this dir.
    * @param  {String} p An absolute path.
    * @return {Boolean}   True (if the path exists) or false.
    */
  exists (p) {
    // return true if path exists
    if (this.path === p) return true

    let e = false
    for (let c of this.children) {
      if (c.path === p) e = true
      if (c.type === 'directory' && c.exists(p)) e = true
    }

    return e
  }

  /**
    * Check whether or not this dir contains the given object (dir or file)
    * @param  {Object} obj An object containing a hash.
    * @return {Boolean}     True (if this directory contains <hash>) or false
    */
  contains (obj) {
    // In rare occasions, it can happen that there is no object given
    if (!obj) return false

    if (typeof obj === 'number') {
      // Same problem as in the find-methods. Only here I don't care anymore.
      // Simply assume a hash. Nothing else could be it.
      obj = { 'hash': obj }
    } else if (!obj.hasOwnProperty('hash')) {
      // Prevent errors.
      return false
    }

    if (this.findDir({ 'hash': obj.hash }) !== null) {
      return true
    } else if (this.findFile({ 'hash': obj.hash }) !== null) {
      // Try a file
      return true
    }

    return false
  }

  /**
    * Has this dir a direct child with the given property?
    * @param  {Object}  obj An object containing a path, name or hash
    * @return {Boolean}     Whether or not the given property represents a direct descendant of this.
    */
  hasChild (obj) {
    let prop = ''
    if (typeof obj === 'string') {
      // assume path
      obj = { path: obj }
    } else if (typeof obj === 'number') {
      // assume hash
      obj = { hash: obj }
    } else if (obj.hasOwnProperty('path')) {
      prop = 'path'
    } else if (obj.hasOwnProperty('name')) {
      prop = 'name'
    } else if (obj.hasOwnProperty('hash')) {
      prop = 'hash'
    }

    if (prop === '') return false

    for (let c of this.children) {
      if (c[prop] === obj[prop]) return true
    }

    return false
  }

  /**
    * On renames, GettlrFile objects will trigger sorts on this object
    * @return {GettlrDir} This for chainability.
    */
  sort () {
    this.children = sort(this.children, this._settings.sorting)
    return this
  }

  /**
    * Loads virtual directories from the settings object
    */
  loadVirtualDirectories () {
    let vds = []
    for (let virtualDir of this._settings.virtualDirectories) {
      vds.push(new GettlrVirtualDirectory(this, virtualDir))
    }

    // Add to the children and sort
    this.children = vds.concat(this.children)
    this.sort()
  }

  /**
    * Adds a virtual directory if it doesn't already exist.
    * @param {String} n The directory's name
    */
  addVirtualDir (n) {
    n = sanitize(n, { replacement: '-' })
    if (this._settings.virtualDirectories.find(e => e.name === n)) {
      // We already got the virtual directory.
      global.application.notifyChange(trans('system.error.virtual_dir_exists', n))
    } else {
      let vd = { 'name': n, 'aliases': {}, 'sorting': 'name-up' }
      this._settings.virtualDirectories.push(vd)
      let dir = new GettlrVirtualDirectory(this, vd, this._vdInterface)
      this.children.push(dir)
    }
  }

  /**
   * Returns the directory's metadata
   * @return {Object} An object containing only the metadata fields
   */
  getMetadata (children = true) {
    // Don't pull in the children twice to prevent an infinite loop
    return {
      'parent': (this.isRoot()) ? null : this.parent.getMetadata(false),
      'path': this.path,
      'name': this.name,
      'hash': this.hash,
      // The project itself is not needed, renderer only checks if it equals
      // null, or not (then it means there is a project)
      'project': (this.project) ? true : null,
      'children': (children) ? this.children.map(elem => elem.getMetadata()) : [],
      'attachments': this.attachments.map(elem => elem.getMetadata()),
      'type': this.type,
      'sorting': this._settings.sorting,
      'modtime': this.modtime
    }
  }

  /**
   * Loads the settings from disk.
   * @return {Promise} Resolves once the settings have been loaded and parsed.
   */
  async _loadSettings () {
    let configPath = path.join(this.path, '.ztr-directory')
    // No config file -> all options at default ->
    // return a promise which immediately resolves.
    if (!isFile(configPath)) return new Promise((resolve, reject) => { resolve() })

    return new Promise((resolve, reject) => {
      fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) reject(err)

        try {
          data = JSON.parse(data)
          Object.assign(this._settings, data)
          // DEBUG: Remove this in Gettlr 1.5, after
          // all unnecessary .ztr-directories have been removed.
          if (this._settingsAreDefault()) {
            if (isFile(configPath)) fs.unlinkSync(configPath)
            return resolve()
          }
        } catch (err) {
          // Remove the file because it seems to be corrupted, it will be overridden
          // with the defaults on exit.
          fs.unlinkSync(configPath)
        }
        resolve()
      })
    })
  }

  async _saveSettings () {
    return new Promise((resolve, reject) => {
      let configPath = path.join(this.path, '.ztr-directory')

      if (this._settingsAreDefault()) {
        // The settings are the default, so no need to write them to file
        if (isFile(configPath)) fs.unlinkSync(configPath)
        return resolve()
      }

      fs.writeFile(configPath, JSON.stringify(this._settings), 'utf8', (err) => {
        if (err) reject(err)
        resolve()
      })
    })
  }

  /**
   * Returns true, if the settings match the template, or false.
   * @return {Boolean} Whether or not the settings are at default.
   */
  _settingsAreDefault () {
    if (JSON.stringify(this._settings) === JSON.stringify(SETTINGS_TEMPLATE)) {
      console.log('Settings are default in dir ' + this.name)
      console.log(JSON.stringify(this._settings) + JSON.stringify(SETTINGS_TEMPLATE))
    }
    // ATTENTION: This relies upon the fact that adds or deletions
    // to the _settings-array DOES NOT happen. Shouldn't happen after
    // all.
    return JSON.stringify(this._settings) === JSON.stringify(SETTINGS_TEMPLATE)
  }

  /**
    * Returns the hash of the dir
    * @return {Number} The hash
    */
  getHash () { return this.hash }

  /**
    * Returns the directory path
    * @return {String} The path
    */
  getPath () { return this.path }

  /**
    * Returns the directory name
    * @return {String} The dir name
    */
  getName () { return this.name }

  /**
    * Dummy function for recursive use. Always returns true.
    * @return {Boolean} Returns true, because this is a directory.
    */
  isDirectory () { return true }

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Returns false.
    */
  isVirtualDirectory () { return false }

  /**
    * Dummy function for recursive use. Always returns false.
    * @return {Boolean} Returns false, because this is not a file.
    */
  isFile () { return false }

  /**
    * Returns false, if this.parent is a directory.
    * @return {Boolean} True or false depending on the type of this.parent
    */
  isRoot () { return !this.parent.isDirectory() }

  /**
    * Checks whether or not the given path p is in the scope of this object
    * @param  {String}  p The path to test
    * @return {Mixed}   "this" if p equals path, true if in scope or false.
    */
  isScope (p) {
    if (p === this.path) {
      return this
    } else if (p.indexOf(this.path) !== -1) {
      return true
    }

    return false
  }
}

module.exports = GettlrDir
