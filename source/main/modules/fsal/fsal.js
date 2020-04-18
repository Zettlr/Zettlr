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
      'create-file': async (src, target, options) => {
        // This action needs the cache because it'll parse a file
        return FSALDir.createFile(src, options, this._cache)
      },
      'duplicate-file': async (src, target, options) => {
        // Duplicating a file is basically the same as creating, only with
        // passing the content of an existing file to the createFile
        // function (as a content-property for the options)
        return FSALDir.createFile(src, options, this._cache)
      },
      'rename-file': async (src, target, options) => {
        let oldHash = src.hash
        let isOpenFile = this._state.openFiles.find(e => e.hash === oldHash) !== undefined
        await FSALFile.rename(src, options)
        // Now we need to re-sort the parent directory
        await FSALDir.sort(src.parent) // Omit sorting
        // Notify of a state change
        this.emit('fsal-state-changed', 'filetree')
        // If applicable, trigger a file synchronisation
        if (isOpenFile) this.emit('fsal-state-changed', 'openFiles')
        return true
      },
      'remove-file': async (src, target, options) => {
        // First remove the file
        await FSALFile.remove(src)
        // Will trigger a change that syncs the files
        this.closeFile(src)
      },
      'save-file': async (src, target, options) => {
        await FSALFile.save(src, options)
        return true
      },
      'search-file': async (src, target, options) => {
        // Searches a file and returns the result
        return FSALFile.search(src, options)
      },
      // Creates a project in a dir
      'create-project': async (src, target, options) => {
        await FSALDir.makeProject(src, options)
      },
      'update-project': async (src, target, options) => {
        // Updates the project properties on a directory.
        await FSALDir.updateProjectProperties(src, options)
      },
      'remove-project': async (src, target, options) => {
        await FSALDir.removeProject(src)
      },
      'create-directory': async (src, target, options) => {
        // Parses a directory and henceforth needs the cache
        await FSALDir.create(src, options, this._cache)
      },
      'rename-directory': async (src, target, options) => {
        // This thing needs the cache
        await FSALDir.rename(src, options, this._cache)
      },
      'remove-directory': async (src, target, options) => {
        await FSALDir.remove(src)
      },
      'move': async (src, target, options) => {
        let openFilesUpdateNeeded = false
        let openDirUpdateNeeded = false
        let newOpenDirHash
        let newFileHashes = []
        if (src.type === 'directory') {
          // A directory is being moved, so check the open files if something
          // needs to change concerning them.
          for (let file of this._state.openFiles) {
            let found = this.findFile(file.hash, src)
            if (found) {
              // The file is in there, so we need to update the open files
              openFilesUpdateNeeded = true
              // Exchange the old directory path for the new one and compute
              // its new hash
              let newHash = hash(file.path.replace(src.parent.path, target.path))
              newFileHashes.push(newHash)
            } else {
              // Nothing really to do
              newFileHashes.push(file.hash)
            }
          }
        } else if (src.type === 'file') {
          if (this._state.openFiles.includes(src)) {
            // The source is an open file, we need to account for that.
            openFilesUpdateNeeded = true
            let newHash = hash(src.path.replace(src.parent.path, target.path))
            newFileHashes.push(newHash)
            newFileHashes = this._state.openFiles.map(e => e.hash)
            newFileHashes.splice(newFileHashes.indexOf(src.hash), 1, newHash)
          }
        }

        if (
          src.type === 'directory' &&
          (src === this._state.openDirectory ||
          this.findDir(this._state.openDirectory.hash, src))
        ) {
          // Compute the new hash and indicate an update is necessary
          openDirUpdateNeeded = true
          newOpenDirHash = hash(this._state.openDirectory.path.replace(src.parent.path, target.path))
        }

        // Now perform the actual move. What the action will do is re-read the
        // new source again, and insert it into the target, so the filetree is
        // good to go afterwards.
        await FSALDir.move(src, target, this._cache)

        // Emit an event notifying the app that the file tree has changed. This
        // will cause a full new tree to be sent to the renderer. This way we
        // can be sure it'll be accurate.
        this.emit('fsal-state-changed', 'filetree')

        // Afterwards, let's see if we have to change something. These
        // functions will notify the application respectively.
        if (openFilesUpdateNeeded) this.setOpenFiles(newFileHashes)
        if (openDirUpdateNeeded) this.setOpenDirectory(this.findDir(newOpenDirHash))
      } // END: move-action
    }

    // Finally, set up listeners for global targets
    global.targets.on('update', (hash) => {
      let file = this.findFile(hash)
      if (!file) return // Not our business
      // Simply pull in the new target
      FSALFile.setTarget(file, global.targets.get(hash))
      // Send a fresh version of this file to the renderer.
      // TODO: Do this via emits!
      global.application.fileUpdate(hash, FSALFile.metadata(file))
    })
    global.targets.on('remove', (hash) => {
      let file = this.findFile(hash)
      if (!file) return // Also not our business
      FSALFile.setTarget(file, null) // Reset
      // Send a fresh version of this file to the renderer.
      // TODO: Do this via emits!
      global.application.fileUpdate(hash, FSALFile.metadata(file))
    })
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

  /**
   * Called by the main object once to set the open files for the editor to pull.
   * @param {Array} fileArray An array with hashes to open
   */
  setOpenFiles (fileArray) {
    let files = fileArray.map(f => this.findFile(f))
    files = files.filter(elem => elem != null)
    this._state.openFiles = files

    // Make sure the config is consistent and we remove non-existent files
    global.config.set('openFiles', this._state.openFiles.map(e => e.hash))
  }

  /**
   * Sorts the openFiles according to hashArray, and returns the new sorting.
   * @param {Array} hashArray An array with hashes to sort with
   * @return {Array} The new sorting
   */
  sortOpenFiles (hashArray) {
    if (!Array.isArray(hashArray)) return this._state.openFiles
    // Expand the hash array
    let notFound = this._state.openFiles.filter(e => !hashArray.includes(e.hash))
    let newSorting = hashArray.map(e => this._state.openFiles.find(file => file.hash === e))
    // Then filter out undefines from the find function
    newSorting = newSorting.filter(e => e !== undefined)

    // Finally make sure that not found elements are still added again.
    if (notFound.length > 0) {
      global.log.warning(`${notFound.length} elements were not found in the new sorting! Adding anyway ...`)
      newSorting.concat(notFound)
    }

    this._state.openFiles = newSorting
    return newSorting
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
      // Splicing does not trigger a change,
      // so we need to manually trigger that.
      this.emit('fsal-state-changed', 'openFiles')
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
    let returnFile = FSALFile.metadata(file)
    returnFile.content = await FSALFile.load(file)
    return returnFile
  }

  /**
   * Returns a lean directory tree, ready to be stringyfied for IPC calls.
   */
  getTreeMeta () {
    let ret = []
    for (let root of this._state.filetree) {
      ret.push(this.getMetadataFor(root))
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
  findDir (val, baseTree = this._state.filetree) {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    // let found = findObject(this._roots, 'hash', val, 'children')
    let found = findObject(baseTree, 'hash', val, 'children')
    if (!found || found.type !== 'directory') return null
    return found
  }

  /**
   * Attempts to find a file in the FSAL. Returns null if not found.
   * @param {Mixed} val Either an absolute path or a hash
   * @return {Mixed} Either null or the wanted file
   */
  findFile (val, baseTree = this._state.filetree) {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    // let found = findObject(this._roots, 'hash', val, 'children')
    let found = findObject(baseTree, 'hash', val, 'children')
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
   * Returns true, if the haystack contains a descriptor with the same name as needle.
   * @param {Object} haystack A file/dir descriptor
   * @param {Object} needle A file or directory descriptor
   */
  hasChild (haystack, needle) {
    // Hello, PHP
    if (haystack.type === 'file') return false

    // If a name checks out, return true
    for (let child of haystack.children) {
      if (child.name === needle.name) return true
    }

    return false
  }

  setOpenDirectory (dirObject) {
    this._state.openDirectory = dirObject
  }

  getOpenDirectory () { return this._state.openDirectory }

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
