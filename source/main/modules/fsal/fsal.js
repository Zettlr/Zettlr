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
const isAttachment = require('../../../common/util/is-attachment')
const objectToArray = require('../../../common/util/object-to-array')
const findObject = require('../../../common/util/find-object')
const FSALFile = require('./fsal-file')
const FSALDir = require('./fsal-directory')
const FSALAttachment = require('./fsal-attachment')
const FSALWatchdog = require('./fsal-watchdog')
const FSALCache = require('./fsal-cache')
const hash = require('../../../common/util/hash')

module.exports = class FSAL extends EventEmitter {
  constructor (cachedir) {
    super()
    global.log.verbose('FSAL booting up ...')
    this._cache = new FSALCache(path.join(cachedir, 'fsal/cache'))
    this._watchdog = new FSALWatchdog()
    this._isCurrentlyHandlingRemoteChange = false
    this._remoteChangeBuffer = [] // Holds events for later processing
    this._remoteChangeTimeout = null // Holds the timeout to ignore remote changes

    this._state = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      openFiles: [],
      activeFile: null, // Can contain an active file (active in the editor)
      filetree: [] // Contains the full filetree
    }

    // The following actions can be run on the file tree
    this._actions = {
      // TODO: Doesn't emit currently
      'sort': async (src, target, options) => {
        // NOTE: Does not generate watchdog events
        return FSALDir.sort(src, options)
      },
      // TODO: Doesn't emit currently
      'create-file': async (src, target, options) => {
        // This action needs the cache because it'll parse a file
        // NOTE: Generates an add-event
        this._watchdog.ignoreEvents({
          'event': 'add',
          'path': path.join(src.path, options.name)
        })
        return FSALDir.createFile(src, options, this._cache)
      },
      // TODO: Doesn't emit currently
      'duplicate-file': async (src, target, options) => {
        // Duplicating a file is basically the same as creating, only with
        // passing the content of an existing file to the createFile
        // function (as a content-property for the options)
        // NOTE: Generates an add-event
        this._watchdog.ignoreEvents({
          'event': 'add',
          'path': path.join(src.path, options.name)
        })
        return FSALDir.createFile(src, options, this._cache)
      },
      'rename-file': async (src, target, options) => {
        // NOTE: Generates 1x unlink, 1x add
        let oldHash = src.hash
        let isOpenFile = this._state.openFiles.find(e => e.hash === oldHash) !== undefined
        let isRoot = src.parent == null

        this._watchdog.ignoreEvents({
          'event': 'unlink',
          'path': src.path
        })
        this._watchdog.ignoreEvents({
          'event': 'add',
          'path': path.join(path.dirname(src.path), options.name)
        })

        await FSALFile.rename(src, this._cache, options)
        // Now we need to re-sort the parent directory
        if (!isRoot) await FSALDir.sort(src.parent) // Omit sorting

        // Notify of a state change
        this.emit('fsal-state-changed', 'filetree')
        // If applicable, trigger a file synchronisation
        if (isOpenFile) this.emit('fsal-state-changed', 'openFiles')
        return true
      },
      // TODO: Doesn't emit currently
      'remove-file': async (src, target, options) => {
        // NOTE: Generates 1x unlink
        // First remove the file
        this._watchdog.ignoreEvents({
          'event': 'unlink',
          'path': src.path
        })
        await FSALFile.remove(src)
        // Will trigger a change that syncs the files
        this.closeFile(src) // Does nothing if the file is not open
      },
      'save-file': async (src, target, options) => {
        // NOTE: Generates 1x change
        this._watchdog.ignoreEvents({ 'event': 'change', 'path': src.path })
        await FSALFile.save(src, this._cache, options)
        // Notify that a file has saved, which strictly speaking does not
        // modify the openFiles array, but does change the modification flag.
        this.emit('fsal-state-changed', 'fileSaved')
        return true
      },
      'search-file': async (src, target, options) => {
        // NOTE: Generates no events
        // Searches a file and returns the result
        return FSALFile.search(src, options)
      },
      // Creates a project in a dir
      // TODO: Doesn't emit currently
      'create-project': async (src, target, options) => {
        // NOTE: Generates no events as dotfiles are not watched
        await FSALDir.makeProject(src, options)
      },
      // TODO: Doesn't emit currently
      'update-project': async (src, target, options) => {
        // NOTE: Generates no events as dotfiles are not watched
        // Updates the project properties on a directory.
        await FSALDir.updateProjectProperties(src, options)
      },
      // TODO: Doesn't emit currently
      'remove-project': async (src, target, options) => {
        // NOTE: Generates no events as dotfiles are not watched
        await FSALDir.removeProject(src)
      },
      'create-directory': async (src, target, options) => {
        // Parses a directory and henceforth needs the cache
        // NOTE: Generates 1x add
        this._watchdog.ignoreEvents({
          'event': 'addDir',
          'path': path.join(src.path, options.name)
        })
        await FSALDir.create(src, options, this._cache)

        // Notify the event listeners
        this.emit('fsal-state-changed', 'directory', {
          'oldHash': src.hash,
          'newHash': src.hash
        })
      },
      'rename-directory': async (src, target, options) => {
        // We are probably going to need that code from the move action
        let openFilesUpdateNeeded = false
        let openDirUpdateNeeded = false
        let newOpenDirHash
        let newFileHashes = []
        // A directory is being moved, so check the open files if something
        // needs to change concerning them.
        for (let file of this._state.openFiles) {
          let found = this.findFile(file.hash, src)
          if (found) {
            // The file is in there, so we need to update the open files
            openFilesUpdateNeeded = true
            // Exchange the old directory path for the new one and compute
            // its new hash
            let newHash = hash(file.path.replace(path.dirname(src.path), target.path))
            newFileHashes.push(newHash)
          } else {
            // Nothing really to do
            newFileHashes.push(file.hash)
          }
        }

        if (src === this._state.openDirectory ||
          this.findDir(this._state.openDirectory.hash, src)) {
          // Compute the new hash and indicate an update is necessary
          openDirUpdateNeeded = true
          newOpenDirHash = hash(this._state.openDirectory.path.replace(path.dirname(src.path), target.path))
        }

        // Now that we have prepared potential updates,
        // let us perform the rename.
        // NOTE: Generates 1x unlink, 1x add for each child + src!
        let oldPrefix = path.join(path.dirname(src.path), src.name)
        let newPrefix = path.join(path.dirname(src.path), options.name)

        let arr = objectToArray(src, 'children')
        let adds = []
        let removes = []
        for (let obj of arr) {
          adds.push({
            'event': obj.type === 'file' ? 'add' : 'addDir',
            // Converts /old/path/oldname/file.md --> /old/path/newname/file.md
            'path': obj.path.replace(oldPrefix, newPrefix)
          })
          removes.push({
            'event': obj.type === 'file' ? 'unlink' : 'unlinkDir',
            'path': obj.path
          })
        }

        // Now concat the removes in reverse direction and ignore them
        this._watchdog.ignoreEvents(adds.concat(removes))

        await FSALDir.rename(src, options, this._cache)

        if (!src.parent) {
          this.emit('fsal-state-changed', 'filetree')
        } else {
          // Update the parent
          this.emit('fsal-state-changed', 'directory', {
            'oldHash': src.parent.hash,
            'newHash': src.parent.hash
          })
        }

        // Make sure we have a correct set of open files
        this._refetchOpenFiles()

        // Afterwards, let's see if we have to change something. These
        // functions will notify the application respectively.
        if (openFilesUpdateNeeded) this.setOpenFiles(newFileHashes)
        if (openDirUpdateNeeded) this.setOpenDirectory(this.findDir(newOpenDirHash))
      },
      // TODO: Doesn't emit currently
      'remove-directory': async (src, target, options) => {
        // NOTE: Generates 1x unlink for each child + src!
        let arr = objectToArray(src, 'children').map(e => {
          return {
            'event': e.type === 'file' ? 'unlink' : 'unlinkDir',
            'path': e.path
          }
        })

        this._watchdog.ignoreEvents(arr)
        await FSALDir.remove(src)
      },
      // TODO: Doesn't emit currently (at least not consistently)
      'move': async (src, target, options) => {
        // NOTE: Generates 1x unlink, 1x add for each child, src and on the target!
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

        // Now we need to generate the ignore events that are to be expected.
        let sourcePath = src.path
        let targetPath = path.join(target.path, src.name)
        let arr = objectToArray(src, 'children')
        let adds = []
        let removes = []
        for (let obj of arr) {
          adds.push({
            'event': obj.type === 'file' ? 'add' : 'addDir',
            // Converts /path/source/file.md --> /path/target/file.md
            'path': obj.path.replace(sourcePath, targetPath)
          })
          removes.push({
            'event': obj.type === 'file' ? 'unlink' : 'unlinkDir',
            'path': obj.path
          })
        }
        this._watchdog.ignoreEvents(adds.concat(removes))

        // Now perform the actual move. What the action will do is re-read the
        // new source again, and insert it into the target, so the filetree is
        // good to go afterwards.
        await FSALDir.move(src, target, this._cache)

        // Now update both the source's parent and the target
        this.emit('fsal-state-changed', 'directory', {
          // We cannot move roots, so the source WILL have a parent
          'oldHash': src.parent.hash, // NOTE that src still points to the old location
          'newHash': src.parent.hash
        })
        this.emit('fsal-state-changed', 'directory', {
          // We cannot move into files, so target WILL be a directory
          'oldHash': target.hash,
          'newHash': target.hash
        })

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
      this.emit('fsal-state-changed', 'file', {
        'oldHash': file.hash,
        'newHash': file.hash
      })
    })
    global.targets.on('remove', (hash) => {
      let file = this.findFile(hash)
      if (!file) return // Also not our business
      FSALFile.setTarget(file, null) // Reset
      this.emit('fsal-state-changed', 'file', {
        'oldHash': file.hash,
        'newHash': file.hash
      })
    })

    this._watchdog.on('change', async (event, changedPath) => {
      // Buffer the event for later
      this._remoteChangeBuffer.push({ 'event': event, 'changedPath': changedPath })

      // Handle the buffer if we're not currently handling a change.
      if (!this._isCurrentlyHandlingRemoteChange) this._afterRemoteChange()
    })
  } // END constructor

  /**
   * Triggers on remote changes, detected by the FSAL watchdog.
   *
   * @param {string} event       The triggered event (equals chokidar event).
   * @param {string} changedPath The path on which this event was triggered.
   */
  async _onRemoteChange (event, changedPath) {
    // Lock the function during processing
    this._isCurrentlyHandlingRemoteChange = true

    // Five possible events: unlink, unlinkDir, add, addDir, and change
    // In case of unlink, we have the descriptor loaded, in case of add
    // we need to search for the parent
    let descriptorHash
    let descriptor
    if ([ 'change', 'unlink', 'unlinkDir' ].includes(event)) {
      descriptorHash = hash(changedPath)
      // It may be that an attachment was unlinked/changed. In this case make
      // sure to pull in its parent directory.
      if (isAttachment(changedPath, true)) descriptorHash = hash(path.dirname(changedPath))
      descriptor = this.find(descriptorHash)
    } else {
      // Both in case of add and addDir there'll be a parent directory
      // we have to find
      let dir
      do {
        let oldDir = dir
        dir = path.dirname(changedPath)
        if (dir === oldDir) break // We've reached the top of the file system
        descriptorHash = hash(dir)
      } while (!(descriptor = this.find(descriptorHash)))
    }

    // Now we should definitely have a descriptor
    if (!descriptor) {
      global.log.warning('Could not process remote change, as no fitting descriptor was found', {
        'event': event,
        'path': changedPath
      })
      console.log('Could not process change', event, changedPath)
      return
    }

    // Now we have a descriptor and an event to process. First, we need to
    // retrieve some information about our state. We need to do this beforehand
    // so that we can trigger these events *after* we have updated the internal
    // state, as otherwise some things might go wrong, especially if the
    // renderer receives an update event and does not yet have the necessary
    // state updates applied. isAddEvent helps us distinguish if we really need
    // to update the state or not.
    let isAddEvent = [ 'add', 'addDir' ].includes(event)
    let isRoot = this._state.filetree.includes(descriptor) && !isAddEvent
    let isOpenDir = descriptor === this._state.openDirectory && !isAddEvent
    let isOpenFile = this._state.openFiles.includes(descriptor) && !isAddEvent
    let rootIndex = -1
    if (event === 'unlinkDir' && isRoot) rootIndex = this._state.filetree.indexOf(descriptor)

    let isDirectoryUpdateNeeded = false
    let isFileUpdateNeeded = false
    let isTreeUpdateNeeded = false
    let directoryToUpdate = null
    let fileToUpdate = null

    // Now let's distinguish the different scenarios we need to handle
    if (isAttachment(changedPath, true)) {
      console.log(`Attachment update detected: ${event} for ${changedPath}`)
      // The descriptor contains the parent directory of the attachment, and
      // it suffices to have it rescan its children, which we'll achieve by
      // simply reparsing the directory.
      let newdir = await FSALDir.parse(descriptor.path, this._cache, descriptor.parent || null)
      FSALDir.sort(newdir)
      // We can't use isRoot, as it'll be false if it's an add-event
      if (this._state.filetree.includes(descriptor)) {
        let index = this._state.filetree.indexOf(descriptor)
        this._state.filetree.splice(index, 1, newdir)
      } else {
        let index = descriptor.parent.children.indexOf(descriptor)
        descriptor.parent.children.splice(index, 1, newdir)
      }
      isDirectoryUpdateNeeded = true
      directoryToUpdate = descriptor
    } else if (isRoot && event === 'unlinkDir') {
      console.log('Removing root directory')
      // It's a directory and it has been removed -> remove it from the state
      this._state.filetree.splice(this._state.filetree.indexOf(descriptor), 1)
      isTreeUpdateNeeded = true
    } else if (isRoot && event === 'change') {
      console.log('Changing root file')
      // A root file has changed
      let newfile = await FSALFile.parse(changedPath, this._cache)
      this._state.filetree.splice(this._state.filetree.indexOf(descriptor), 1, newfile)
      isFileUpdateNeeded = true
      fileToUpdate = newfile
    } else if (event === 'add') {
      console.log('Adding file')
      // It may be that the file is already present due to a directory
      // rename, so make sure not to add the thing twice.
      if (!descriptor.children.find(e => e.path === changedPath)) {
        console.log('File was not yet present, adding ...')
        // New file --> add it, trigger a dir update and be done with it
        let newfile = await FSALFile.parse(changedPath, this._cache, descriptor)
        descriptor.children.push(newfile)
        FSALDir.sort(descriptor)
        isDirectoryUpdateNeeded = true
        directoryToUpdate = descriptor
      }
    } else if (event === 'addDir') {
      console.log('Adding directory')
      // It may be that the directory is already present due to a rename,
      // so make sure not to add the thing twice.
      if (!descriptor.children.find(e => e.path === changedPath)) {
        // New directory --> same as above
        let newdir = await FSALDir.parse(changedPath, this._cache, descriptor)
        descriptor.children.push(newdir)
        FSALDir.sort(descriptor)
        isDirectoryUpdateNeeded = true
        directoryToUpdate = descriptor
      }
    } else if (event === 'change') {
      // We have to make sure the "change" event was appropriate
      // This is DEBUG as of now (See issue #773 for more information)
      let hasChangedOnDisk = await FSALFile.hasChangedOnDisk(descriptor)
      if (!hasChangedOnDisk) {
        global.log.info(`The file ${descriptor.name} has not changed, but a change event was fired by chokidar.`)
      } else {
        console.log('Changing file')
        // A file has been changed (its contents) --> replace it
        let newfile = await FSALFile.parse(changedPath, this._cache, descriptor.parent)
        let parent = descriptor.parent
        parent.children.splice(parent.children.indexOf(descriptor), 1, newfile)
        FSALDir.sort(parent)
        isFileUpdateNeeded = true
        fileToUpdate = newfile
        // In case the file was open, also replace it in the openFiles array
        if (isOpenFile) {
          // Tell the editor to both update the open files and
          // the file contents of the new file
          this._state.openFiles.splice(this._state.openFiles.indexOf(descriptor), 1, newfile)
          this.emit('fsal-state-changed', 'fileContents', { 'hash': hash(changedPath) })
          this.emit('fsal-state-changed', 'openFiles')
        }
      }
    } else if ([ 'unlink', 'unlinkDir' ].includes(event)) {
      console.log('Removing file or directory')
      // A file or directory was removed
      descriptor.parent.children.splice(descriptor.parent.children.indexOf(descriptor), 1)
      isDirectoryUpdateNeeded = true
      directoryToUpdate = descriptor.parent
      // In case it was an open file, also replace it in the openFiles array
      if (isOpenFile) this._state.openFiles.splice(this._state.openFiles.indexOf(descriptor), 1)
      console.log('Removed!')
    }

    if (isOpenDir) { // The event in this case is guaranteed to be unlinkDir
      console.log('Open directory has changed')
      this._state.openDirectory = null // Unset
      // If it has not been a root directory, select its parent
      if (!isRoot) {
        console.log('Setting open dir to its parent ...')
        this._state.openDirectory = descriptor.parent
      } else if (isRoot) {
        // It was a root directory, so we need to find another root dir
        if (rootIndex === this._state.filetree.length) {
          console.log('Setting directory to a previous one')
          // Last directory has been removed, check if there are any before it
          let dirs = this._state.filetree.filter(dir => dir.type === 'directory')
          if (dirs.length > 0) this._state.openDirectory = dirs[dirs.length - 1]
        } else {
          // Either the first root or something in between has been removed -->
          // selecting the next sibling is safe, as directories are sorted
          // behind the files.
          console.log('Setting open directory to next one...')
          this._state.openDirectory = this._state.filetree[rootIndex]
        }
      }
    } // END isOpenDir

    // Make sure to pull potential new openFiles from the filetree. There is a
    // variety of events that might change that list. We'll do this check here
    // after everything that might have changed has changed for good.
    this._refetchOpenFiles()

    // Finally, trigger all necessary events
    if (isDirectoryUpdateNeeded) {
      // console.log('Triggering directory update!')
      this.emit('fsal-state-changed', 'directory', {
        'oldHash': directoryToUpdate.hash,
        'newHash': directoryToUpdate.hash
      })
    }

    if (isFileUpdateNeeded) {
      // console.log('Triggering file update!')
      this.emit('fsal-state-changed', 'file', {
        'oldHash': fileToUpdate.hash,
        'newHash': fileToUpdate.hash
      })
    }

    if (isTreeUpdateNeeded) {
      // console.log('Triggering full tree update!')
      this.emit('fsal-state-changed', 'filetree')
    }

    this._isCurrentlyHandlingRemoteChange = false
    this._afterRemoteChange() // Trigger another processing event, if applicable
  }

  _afterRemoteChange () {
    if (this._isCurrentlyHandlingRemoteChange) return // Let's wait for it to finish
    // Called after a remote change has been handled.
    // Let's see if we still have events to handle
    if (this._remoteChangeBuffer.length > 0) {
      let event = this._remoteChangeBuffer.shift()
      this._onRemoteChange(event.event, event.changedPath).catch(e => console.error(e))
    }
  }

  /**
   * Re-fetches all open files from the current file tree. This is necessary if
   * a directory was re-read as the directory's children could (have) been open
   * and in that case one or more of the openFiles are not present in the
   * filetree anymore. This fixes that.
   */
  _refetchOpenFiles () {
    let oldHashes = this._state.openFiles.map(e => e.hash)
    this._state.openFiles = this._state.openFiles.map(e => this.findFile(e.hash)).filter(e => e != null)

    // In case the hashes don't match again (e.g. files have been removed or
    // added, notify the main process.)
    if (this._state.openFiles.map(e => e.hash) !== oldHashes) {
      this.emit('fsal-state-changed', 'openFiles')
    }
  }

  /**
   * Shuts down the service provider.
   *
   * @returns {boolean} Whether or not the shutdown was successful
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
    this.emit('fsal-state-changed', 'filetree')
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
    this.emit('fsal-state-changed', 'filetree')
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
      this._watchdog.watch(p)
    } else if (isDir(p)) {
      await this._loadDir(p)
      this._watchdog.watch(p)
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
    for (let p of Object.keys(this._state.filetree)) {
      this._watchdog.unwatch(p)
    }

    this._state.filetree = []
    this._state.openFiles = []
    this._state.openDirectory = null
    this._state.activeFile = null

    // Emit as if there was no morning after!
    this.emit('fsal-state-changed', 'filetree')
    this.emit('fsal-state-changed', 'openFiles')
    this.emit('fsal-state-changed', 'openDirectory')
    this.emit('fsal-state-changed', 'activeFile')
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
      this.emit('fsal-state-changed', 'openDirectory')
    } else if (this._state.openFiles.includes(root)) {
      // Close the file
      this._state.openFiles.splice(this._roots.indexOf(root), 1)
      this.emit('fsal-state-changed', 'openFiles')
    }

    this._state.filetree.splice(this._state.filetree.indexOf(root), 1)
    this._watchdog.unwatch(root.path)
    this.emit('fsal-state-changed', 'filetree')

    // Make sure to keep the openFiles array updated.
    this._refetchOpenFiles()
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
    this.emit('fsal-state-changed', 'openFiles')

    // Make sure the config is consistent and we remove non-existent files
    // TODO: Move to application
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
    this.emit('fsal-state-changed', 'openFiles')
    return newSorting
  }

  /**
   * Returns a file's metadata including the contents.
   * @param {Object} file The file descriptor
   */
  openFile (file) {
    if (this._state.openFiles.includes(file)) return false
    console.log('FIle ' + file.name + ' is now open')
    this._state.openFiles.push(file)
    this.emit('fsal-state-changed', 'openFiles')
    return true
  }

  /**
   * Closes a given file.
   * @param {Object} file The file descriptor
   */
  closeFile (file) {
    if (this._state.openFiles.includes(file)) {
      this._state.openFiles.splice(this._state.openFiles.indexOf(file), 1)
      this.emit('fsal-state-changed', 'openFiles')
      console.log('FIle ' + file.name + ' is now closed')
      return true
    } else {
      return false
    }
  }

  /**
   * Sets the active file pointer to the file identified by the hash.
   * @param {number} hash The hash of the file to set as active
   */
  setActiveFile (hash) {
    let file = this.findFile(hash)
    if (file && this._state.openFiles.includes(file)) {
      this._state.activeFile = file
      this.emit('fsal-state-changed', 'activeFile')
    } else {
      console.log('Could not set active file: Either not found or not open.')
    }
  }

  /**
   * Returns the hash of the currently active file.
   * @returns {number} The hash of the active file.
   */
  getActiveFile () {
    return (this._state.activeFile) ? this._state.activeFile.hash : null
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
   * Sets the modification flag on an open file
   */
  markDirty (file) {
    if (!this._state.openFiles.includes(file)) {
      console.error('Cannot mark dirty a non-open file!')
      return false
    }

    return FSALFile.markDirty(file)
  }

  /**
   * Removes the modification flag on an open file
   */
  markClean (file) {
    if (!this._state.openFiles.includes(file)) {
      console.error('Cannot mark clean a non-open file!')
      return false
    }

    return FSALFile.markClean(file)
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   */
  isClean () {
    for (let openFile of this._state.openFiles) {
      if (openFile.modified) console.log('NOT CLEAN: ' + openFile.name)
      if (openFile.modified) return false
    }
    return true
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
  findExact (query, property = 'name') {
    return findObject(this._state.filetree, property, query, 'children')
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
    this.emit('fsal-state-changed', 'openDirectory')
  }

  getOpenDirectory () { return this._state.openDirectory }

  /**
   * Clears the cache
   */
  clearCache () { return this._cache.clearCache() }

  /**
   * Runs an action on the file tree
   */
  async runAction (actionName, options) {
    if (!Object.keys(this._actions).includes(actionName)) {
      throw new Error(`Unknown action ${actionName}`)
    }

    let ret = await this._actions[actionName](
      options.source,
      options.target || options.source, // Some actions only have a source
      options.info
    )
    return ret
  }
}
