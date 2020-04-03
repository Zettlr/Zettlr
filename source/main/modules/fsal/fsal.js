/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FSAL
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Represents the file system and provides
 *                  an abstraction interface to interact with it.
 *
 * END HEADER
 */

const path = require('path')
const EventEmitter = require('events')
const isFile = require('../../../common/util/is-file')
const isDir = require('../../../common/util/is-dir')
const findObject = require('../../../common/util/find-object')
const FSALFile = require('./fsal-file')
const FSALDir = require('./fsal-directory')
const FSALAttachment = require('./fsal-attachment')
const Cache = require('./fsal-cache')
const hash = require('../../../common/util/hash')
const onChange = require('on-change')
const FILETYPES = require('../../../common/data.json').filetypes

module.exports = class FSAL extends EventEmitter {
  constructor (cachedir) {
    super()
    global.log.verbose('FSAL booting up ...')
    this._cache = new Cache(path.join(cachedir, 'fsal/cache'))

    let stateObj = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      openFiles: [],
      filetree: [] // Contains the full filetree
    }

    // Listen to changes in the state, so that we can emit events
    this._state = onChange(stateObj, (objPath, current, prev) => {
      console.log('State changed!', objPath)
      this.emit('fsal-state-changed', objPath)
    }, {
      // Only watch the top-level properties, because otherwise sad Electron
      // doesn't like me anymore, because apparently it's too much to ask that
      // it simply stringifies watched properties, even if they are primitives.
      'isShallow': true
    })

    // The following actions can be run on the file tree
    this._actions = {
      'sort': async (src, target, options) => { return FSALDir.sort(src, options) },
      'create-file': async (src, target, options) => { return FSALDir.createFile(src, options) },
      'save-file': async (src, target, options) => {
        await FSALFile.save(src, options)
        // Re-parse the file
        let newFile = await FSALFile.parse(src.path, this._cache, src.parent)

        // Update the correct file object in memory
        for (let prop of Object.keys(src)) {
          if (newFile.hasOwnProperty(prop)) src[prop] = newFile[prop]
        }
        return true
      }
    }
  }

  /**
   * Shuts down the provider
   * @return {Boolean} Whether or not the shutdown was successful
   */
  shutdown () {
    global.log.verbose('FSAL shutting down ...')
    this._cache.persist()
    return true
  }

  /**
   * Opens, reads, and parses a file to be loaded into the FSAL.
   * @param {String} filePath The file to be loaded
   */
  async _loadFile (filePath) {
    // Loads a standalone file
    let start = Date.now()
    let file = await FSALFile.parse(filePath, this._cache)
    this._state.filetree.push(file)
    console.log(`${Date.now() - start} ms: Loaded file ${filePath}`) // DEBUG
  }

  /**
   * Loads a directory tree into the FSAL recursively.
   * @param {String} dirPath The dir to be loaded
   */
  async _loadDir (dirPath) {
    // Loads a directory
    let start = Date.now()
    let dir = await FSALDir.parse(dirPath, this._cache)
    this._state.filetree.push(dir)
    console.log(`${Date.now() - start} ms: Loaded directory ${dirPath}`) // DEBUG
  }

  /**
   * Loads a non-existent directory into the FSAL using dummy data.
   * @param {String} dirPath The directory
   */
  async _loadPlaceholder (dirPath) {
    // Load a "dead" directory
    console.log('Creating placeholder for dir ' + dirPath) // DEBUG
  }

  /**
   * Loads a given path into the FSAL.
   * @param {String} p The path to be loaded
   */
  async loadPath (p) {
    // Load a path
    if (isFile(p)) {
      await this._loadFile(p)
    } else if (isDir(p)) {
      await this._loadDir(p)
    } else if (path.extname(p) === '') {
      // It's not a file (-> no extension) but it
      // could not be found -> mark it as "dead"
      await this._loadPlaceholder(p)
    } else {
      // If we've reached here the path poses a problem -> notify caller
      return false
    }
    return true
  }

  /**
   * Unloads the complete FSAL, can be used
   * for preparation of a full reload.
   */
  unloadAll () {
    this._state.filetree = []
  }

  /**
   * Unloads a Root from the FSAL.
   * @param {Object} root The root to be removed.
   */
  unloadPath (root) {
    if (!this._state.filetree.includes(root)) {
      return false
    }

    if (this._state.openDirectory === root) {
      // Unset the directory pointer
      this._state.openDirectory = null
    } else if (this._state.openFiles.includes(root)) {
      // Close the file
      this._state.openFiles.splice(this._roots.indexOf(root), 1)
    }

    this._state.filetree.splice(this._state.filetree.indexOf(root), 1)
    return true
  }

  setOpenFiles (fileArray) {
    // Such failchecks
    this._state.openFiles = fileArray.map(f => this.findFile(f))
  }

  /**
   * Returns a file's metadata including the contents.
   * @param {Object} file The file descriptor
   */
  openFile (file) {
    if (this._state.openFiles.includes(file)) return false
    this._state.openFiles.push(file) // Will trigger a state update
    return true
  }

  /**
   * Closes a given file.
   * @param {Object} file The file descriptor
   */
  closeFile (file) {
    if (this._state.openFiles.includes(file)) {
      this._state.openFiles.splice(this._state.openFiles.indexOf(file), 1)
      return true
    } else {
      return false
    }
  }

  /**
   * Returns a list of hashes for all open files
   */
  getOpenFiles () {
    return this._state.openFiles.map(elem => elem.hash)
  }

  /**
   * Returns a file metadata object including the file contents.
   * @param {Object} file The file descriptor
   */
  async getFileContents (file) {
    console.log('Getting file contents ...')
    file = FSALFile.metadata(file)
    console.log('Got file:', file)
    file.content = await FSALFile.load(file)
    console.log('File done', file)
    return file
  }

  /**
   * Returns a lean directory tree, ready to be stringyfied for IPC calls.
   */
  getTreeMeta () {
    let ret = []
    // for (let root of this._roots) {
    for (let root of this._state.filetree) {
      if (root.type === 'directory') {
        ret.push(FSALDir.metadata(root))
      } else if (root.type === 'file') {
        ret.push(FSALFile.metadata(root))
      } else {
        // Dead directory or so
      }
    }

    return ret
  }

  /**
   * Retrieves the metadata for a single object.
   * @param {Object} obj The metadata object
   */
  getMetadataFor (obj) {
    if (obj.type === 'directory') return FSALDir.metadata(obj)
    if (obj.type === 'file') return FSALFile.metadata(obj)
    if (obj.type === 'attachment') return FSALAttachment.metadata(obj)
    return undefined
  }

  /**
   * Attempts to find a directory in the FSAL. Returns null if not found.
   * @param {Mixed} val Either an absolute path or a hash
   * @return {Mixed} Either null or the wanted directory
   */
  findDir (val) {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    // let found = findObject(this._roots, 'hash', val, 'children')
    let found = findObject(this._state.filetree, 'hash', val, 'children')
    if (!found || found.type !== 'directory') return null
    return found
  }

  /**
   * Attempts to find a file in the FSAL. Returns null if not found.
   * @param {Mixed} val Either an absolute path or a hash
   * @return {Mixed} Either null or the wanted file
   */
  findFile (val) {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    // let found = findObject(this._roots, 'hash', val, 'children')
    let found = findObject(this._state.filetree, 'hash', val, 'children')
    if (!found || found.type !== 'file') return null
    return found
  }

  /**
   * Searches for a file with the exact name as given,
   * accounting for missing endings.
   * @param {String} name The file name to be searched for
   */
  findExact (query) {
    let ext = path.extname(query)
    if (ext.length > 1) {
      // file ending given
      // return findObject(this._roots, 'name', query, 'children')
      return findObject(this._state.filetree, 'name', query, 'children')
    } else {
      // No file ending given, so let's test all allowed
      for (let type of FILETYPES) {
        // let found = findObject(this._roots, 'name', query + type, 'children')
        let found = findObject(this._state.filetree, 'name', query + type, 'children')
        if (found) return found
      }
    }

    return null
  }

  /**
   * Convenience wrapper for findFile && findDir
   * @param {Mixed} val The value to search for (hash or path)
   */
  find (val) {
    let res = this.findFile(val)
    if (!res) return this.findDir(val)
    return res
  }

  /**
   * Returns a count object containing counts for all objects in the file system.
   * @return {Object}
   */
  count () {
    // Bad about JavaScript: It throws with pointers wherever it can.
    // Good about JavaScript: We only need one object and can be sure
    // it'll never be duplicated.
    let count = {
      'attachments': 0,
      'files': 0,
      'dirs': 0
    }

    // for (let root of this._roots) {
    for (let root of this._state.filetree) {
      if (root.type === 'file') {
        count.files++
      } else if (root.type === 'attachment') {
        count.attachments++
      } else {
        count.dirs++
        this._countDir(root, count)
      }
    }

    return count
  }

  _countDir (dir, count) {
    for (let child of dir.children) {
      if (child.type === 'file') {
        count.files++
      } else {
        count.dirs++
        this._countDir(child, count)
      }
    }

    count.attachments += dir.attachments.length
  }

  /**
   * Runs an action on the file tree
   */
  async runAction (actionName, options) {
    if (!Object.keys(this._actions).includes(actionName)) {
      throw new Error(`Unknown action ${actionName}`)
    }

    return this._actions[actionName](
      options.source,
      options.target || options.source, // Some actions only have a source
      options.info
    )
  }
}
