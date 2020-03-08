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

const fs = require('fs').promises
const path = require('path')
const EventEmitter = require('events')
const isFile = require('../../common/util/is-file')
const isDir = require('../../common/util/is-dir')
const findObject = require('../../common/util/find-object')
const FSALFile = require('./includes/fsal-file')
const FSALDir = require('./includes/fsal-directory')
const Cache = require('./includes/fsal-cache')
const hash = require('../../common/util/hash')
const FILETYPES = require('../../common/data.json').filetypes

module.exports = class FSAL extends EventEmitter {
  constructor (cachedir) {
    super()
    global.log.verbose('FSAL booting up ...')
    this._roots = [] // The file system tree(s)
    this._cache = new Cache(path.join(cachedir, 'fsal/cache'))
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
    this._roots.push(await FSALFile.parse(filePath, this._cache))
    console.log(`${Date.now() - start} ms: Loaded file ${filePath}`) // DEBUG
  }

  /**
   * Loads a directory tree into the FSAL recursively.
   * @param {String} dirPath The dir to be loaded
   */
  async _loadDir (dirPath) {
    // Loads a directory
    let start = Date.now()
    this._roots.push(await FSALDir.parse(dirPath, this._cache))
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
      throw new Error(`FSAL: Could not load path ${p}!`)
    }
  }

  /**
   * Unloads the complete FSAL, can be used
   * for preparation of a full reload.
   */
  unloadAll () {
    this._roots = [] // Throw 'em out!
  }

  /**
   * Unloads a Root from the FSAL.
   * @param {Object} root The root to be removed.
   */
  unloadPath (root) {
    if (!this._roots.includes(root)) throw new Error(`Cannot remove root ${root.name} - not open!`)
    this._roots.splice(this._roots.indexOf(root), 1)
    return true
  }

  async getFile (searchParam) {
    let val = searchParam
    if (typeof val === 'object') val = val.hash
    let file = this.findFile(val)

    file.content = await FSALFile.load(file)
    return file
  }

  async createFile (directory, filename) {
    if (typeof directory === 'string') directory = this.findDir(directory)
    return FSALDir.createFile(directory, filename)
  }

  /**
   * Returns a lean directory tree, ready to be stringyfied for IPC calls.
   */
  getTreeMeta () {
    let ret = []
    for (let root of this._roots) {
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
   * Attempts to find a directory in the FSAL. Returns null if not found.
   * @param {Mixed} val Either an absolute path or a hash
   * @return {Mixed} Either null or the wanted directory
   */
  findDir (val) {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    let found = findObject(this._roots, 'hash', val, 'children')
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

    let found = findObject(this._roots, 'hash', val, 'children')
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
      return findObject(this._roots, 'name', query, 'children')
    } else {
      // No file ending given, so let's test all allowed
      for (let type of FILETYPES) {
        let found = findObject(this._roots, 'name', query + type, 'children')
        if (found) return found
      }
    }

    return null
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

    for (let root of this._roots) {
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
}
