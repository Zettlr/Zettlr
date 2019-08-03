/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrDir class
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file contains the ZettlrDir class, modeling a directory
 *                  on disk for the app.
 *
 * END HEADER
 */

const path = require('path')
const fs = require('fs')
const sanitize = require('sanitize-filename')
const ZettlrFile = require('./zettlr-file.js')
const ZettlrAttachment = require('./zettlr-attachment.js')
const ZettlrProject = require('./zettlr-project.js')
const ZettlrVirtualDirectory = require('./zettlr-virtual-directory.js')
const ZettlrInterface = require('./zettlr-interface.js')
const { shell } = require('electron')
const { trans } = require('../common/lang/i18n.js')

// Include helpers
const hash = require('../common/util/hash')
const sort = require('../common/util/sort')
const generateFileName = require('../common/util/generate-filename')
const ignoreDir = require('../common/util/ignore-dir')
const ignoreFile = require('../common/util/ignore-file')
const isFile = require('../common/util/is-file')
const isDir = require('../common/util/is-dir')
const isAttachment = require('../common/util/is-attachment')

const ALLOW_SORTS = ['name-up', 'name-down', 'time-up', 'time-down']
const FILETYPES = require('../common/data.json').filetypes

/**
 * This class models properties and features of a directory on disk.
 */
class ZettlrDir {
  /**
    * Read a directory.
    * @param {Mixed} parent     Either ZettlrDir or Zettlr, depending on root status.
    * @param {String} dir      The full path to the directory
    */
  constructor (parent, dir) {
    if (dir === null || dir === '') {
      throw new Error('Error on ZettlrDir instantiation: dir cannot be empty!')
    }

    // Prepopulate
    this.parent = parent
    this.path = dir
    this.name = path.basename(this.path)
    this.hash = hash(this.path)
    this.project = null // null, if this directory is not a project, and an instance of ZettlrProject, if it is.
    this.children = []
    this.attachments = []
    this.type = 'directory'
    this.sorting = 'name-up'

    // Create an interface for virtual directories
    this._vdInterface = new ZettlrInterface(path.join(this.path, '.ztr-virtual-directories'))

    // The directory might've been just been created.
    try {
      fs.lstatSync(this.path)
    } catch (e) {
      // Error? -> create
      fs.mkdirSync(this.path)
    }

    // Load default files and folders
    // this.scan()
    // Load virtual directories initially (if existent)
    // this.loadVirtualDirectories()

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

  /**
    * Initiates a shutdown to all children
    */
  shutdown () {
    // Shutdown all objects
    for (let c of this.children) {
      c.shutdown()
    }

    if (this.project) {
      this.project.save()
    }

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
    * Notifies the parent (a dir or Zettlr) to send a notification + paths-update.
    * @param  {String} msg The message to be sent.
    */
  notifyChange (msg) {
    this.parent.notifyChange(msg)
  }

  /**
    * Takes an object and returns a ZettlrDir-object (or null)
    * @param  {Object} obj An object containing information for search
    * @return {Mixed}     Either null, if not found, or the ZettlrDir object.
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
        if (dir != null) {
          // Found it
          return dir
        }
      }
    }

    // Not found
    return null
  }

  /**
    * Finds a file in this directory
    * @param  {Object} obj An object containing information on the file.
    * @return {Mixed}     Either ZettlrFile or null, if not found.
    */
  findFile (obj) {
    // Traverse the children
    for (let c of this.children) {
      let file = c.findFile(obj)
      if (file != null) {
        // Found it
        return file
      }
    }

    // Not found
    return null
  }

  /**
    * Either returns a file if the match is exact, or null
    * @param  {String} term The ID to be searched for
    * @return {ZettlrFile}      ZettlrFile or null.
    */
  findExact (term) {
    for (let c of this.children) {
      let file = c.findExact(term)
      if (file != null) {
        return file
      }
    }

    return null
  }

  /**
    * Creates a new subdirectory and returns it.
    * @param  {String} name The name (not path!) for the subdirectory.
    * @return {ZettlrDir}      The newly created directory.
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

    let dir = new ZettlrDir(this, newpath)
    await dir.scan()
    this.children.push(dir)
    this.children = sort(this.children, this.sorting)

    // Return dir for chainability
    return dir
  }

  /**
    * Create a new file in this directory.
    * @param  {String} name The new name, if given
    * @return {ZettlrFile}             The newly created file.
    */
  async newfile (name) {
    if (name == null) {
      // Generate a unique new name
      name = generateFileName()
    }

    name = sanitize(name, { replacement: '-' })
    // This gets executed once the user has not entered any allowed characters
    if ((name === '') || (name == null)) {
      throw new Error(trans('system.error.no_allowed_chars'))
    }

    // Do we have a valid extension?
    if (!FILETYPES.includes(path.extname(name))) {
      name = name + '.md' // Assume Markdown by default
    }

    // Already exists
    if (this.exists(path.join(this.path, name))) {
      throw new Error(trans('system.error.file_exists'))
    }

    // Ignore the creation event
    global.watchdog.ignoreNext('add', path.join(this.path, name))

    // Create a new file.
    let f = new ZettlrFile(this, path.join(this.path, name))
    this.children.push(f)
    this.children = sort(this.children, this.sorting)
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
    * @param  {Mixed} [obj=this] Either ZettlrDir or ZettlrFile
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
      // Remove a file (function was called by a children)
      let index = this.children.indexOf(obj)

      // Should (normally) always be true
      if (index > -1) {
        this.children.splice(index, 1)
      } else {
        // Logically, this should never be executed. But who am I to tell
        // you about logic and software ...
        throw new Error('Could not find child inside array to remove!')
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
      this.parent.sort()
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

    // Reset the interface
    this._vdInterface = new ZettlrInterface(path.join(this.path, '.ztr-virtual-directories'))

    // Re-read
    await this.scan()
  }

  /**
    * Attach a new children to this element (mainly happens while moving)
    * @param  {Mixed} newchild ZettlrDir or ZettlrFile object
    * @return {ZettlrDir}          This for chainability.
    */
  attach (newchild) {
    this.children.push(newchild)
    // Set the correct new parent
    newchild.parent = this
    this.children = sort(this.children, this.sorting)

    return this
  }

  /**
    * Detaches this directory from its parent.
    * @return {ZettlrDir} This for chainability.
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
    // (Re-)Reads this directory.
    await this._loadSettings() // Loads persisted settings on disk

    return new Promise((resolve, reject) => {
      try {
        fs.lstatSync(this.path)
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
          let file = new ZettlrFile(this, f)
          await file.scan() // Asynchronously parse the file
          nChildren.push(file)
        } else if (isDir(f) && !ignoreDir(f)) {
          let dir = new ZettlrDir(this, f)
          await dir.scan() // Asynchronously parse the directory
          nChildren.push(dir)
        } else if (isAttachment(f)) {
          nAttachments.push(new ZettlrAttachment(this, f))
        }
      }
    }

    // Add the virtual directories to the children's list
    this.children = nVirtualDirectories.concat(nChildren)
    this.attachments = nAttachments

    // Final step: Sort
    this.children = sort(this.children, this.sorting)
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
    if (ZettlrProject.isProject(this)) {
      // We can reuse the function here.
      this.makeProject()
    }
  }

  /**
    * Creates a project for this directory.
    */
  makeProject () {
    if (!this.project) {
      this.project = new ZettlrProject(this)
    }
  }

  /**
    * Removes the project from this dir.
    * @return {[type]} [description]
    */
  removeProject () {
    if (this.project) {
      this.project.remove()
      this.project = null
    }
  }

  /**
    * Returns the project.
    * @return {ZettlrProject} The Zettlr Project instance, or null, if there is none.
    */
  getProject () {
    return this.project
  }

  /**
    * Toggles the sorting. Default is name-up
    * @param  {String} [type='name-up'] Can be an allowed sorting, or just time or name.
    * @return {ZettlrDir}               Chainability
    */
  toggleSorting (type = 'name-up') {
    if (ALLOW_SORTS.includes(type)) {
      this.sorting = type
    } else if (type.indexOf('name') > -1) {
      if (this.sorting === 'name-up') {
        this.sorting = 'name-down'
      } else {
        this.sorting = 'name-up'
      }
    } else if (type.indexOf('time') > -1) {
      if (this.sorting === 'time-up') {
        this.sorting = 'time-down'
      } else {
        this.sorting = 'time-up'
      }
    } else {
      this.sorting = 'name-up'
    }

    // Persist sorting
    this._saveSettings()

    this.children = sort(this.children, this.sorting)
    return this
  }

  /**
    * Returns true, if the given path exists somewhere in this dir.
    * @param  {String} p An absolute path.
    * @return {Boolean}   True (if the path exists) or false.
    */
  exists (p) {
    // return true if path exists
    if (this.path === p) {
      return true
    }

    let e = false
    for (let c of this.children) {
      if (c.path === p) {
        e = true
      }

      if (c.type === 'directory') {
        if (c.exists(p)) {
          e = true
        }
      }
    }

    return e
  }

  /**
    * Check whether or not this dir contains the given object (dir or file)
    * @param  {Object} obj An object containing a hash.
    * @return {Boolean}     True (if this directory contains <hash>) or false
    */
  contains (obj) {
    if (!obj) {
      // In rare occasions, it can happen that there is no object given
      return false
    }

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
      obj.path = obj
    } else if (typeof obj === 'number') {
      // assume hash
      obj.hash = obj
    } else if (obj.hasOwnProperty('path')) {
      prop = 'path'
    } else if (obj.hasOwnProperty('name')) {
      prop = 'name'
    } else if (obj.hasOwnProperty('hash')) {
      prop = 'hash'
    }

    if (prop === '') {
      return false
    }

    for (let c of this.children) {
      if (c[prop] === obj[prop]) {
        return true
      }
    }

    return false
  }

  /**
    * On renames, ZettlrFile objects will trigger sorts on this object
    * @return {ZettlrDir} This for chainability.
    */
  sort () {
    console.log('Sorting myself!')
    this.children = sort(this.children, this.sorting)
    return this
  }

  /**
    * Loads virtual directories from disk
    */
  loadVirtualDirectories () {
    let data = this._vdInterface.getData()
    if (!data) {
      // No data in file
      return
    }
    let arr = []
    for (let vd of data) {
      arr.push(new ZettlrVirtualDirectory(this, vd, this._vdInterface))
    }

    // Initial load of virtual directories
    this.children = arr.concat(this.children)
    this.sort()
  }

  /**
    * Adds a virtual directory if it doesn't already exist.
    * @param {String} n The directory's name
    */
  addVirtualDir (n) {
    n = sanitize(n, { replacement: '-' }) // Same rules as "normal" directories. Why? To keep it JSON-safe.
    if (!this._vdInterface.has(n)) {
      let vd = { 'name': n, 'files': [] }
      this._vdInterface.set(vd.name, vd)
      vd = new ZettlrVirtualDirectory(this, vd, this._vdInterface)
      this.children.push(vd)
      this.sort()
    } else {
      // Already exists!
      this.notifyChange(trans('system.error.virtual_dir_exists', n))
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
      'sorting': this.sorting
    }
  }

  async _loadSettings () {
    let configPath = path.join(this.path, '.ztr-directory')
    try {
      fs.lstatSync(configPath)
    } catch (err) {
      // No config file -> all options at default ->
      // return a promise which immediately resolves.
      return new Promise((resolve, reject) => { resolve() })
    }

    return new Promise((resolve, reject) => {
      fs.readFile(configPath, 'utf8', (err, data) => {
        if (err) reject(err)

        data = JSON.parse(data)
        // DEBUG: Remove this after the next release, after
        // all unnecessary .ztr-directories have been removed.
        if (data.settings.sorting === this.sorting) {
          try {
            fs.unlinkSync(configPath)
          } catch (e) {
            // Apparently the file disappeared again
          }
          return resolve()
        }
        this.sorting = data.settings.sorting
        resolve()
      })
    })
  }

  async _saveSettings () {
    return new Promise((resolve, reject) => {
      let configPath = path.join(this.path, '.ztr-directory')
      // Prepare settings
      let data = {
        'settings': {
          'sorting': this.sorting
        }
      }

      if (this.sorting === 'name-up') {
        // The settings are the default, so no need to write them to file
        try {
          fs.lstatSync(configPath)
          fs.unlinkSync(configPath)
        } catch (e) {
          // Nothing to do
        }
        return
      }

      fs.writeFile(configPath, JSON.stringify(data), 'utf8', (err) => {
        if (err) reject(err)
        resolve()
      })
    })
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

module.exports = ZettlrDir
