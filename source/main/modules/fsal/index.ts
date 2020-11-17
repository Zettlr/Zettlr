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

import path from 'path'
import EventEmitter from 'events'
import isFile from '../../../common/util/is-file'
import isDir from '../../../common/util/is-dir'
import isAttachment from '../../../common/util/is-attachment'
import objectToArray from '../../../common/util/object-to-array'
import findObject from '../../../common/util/find-object'
import * as FSALFile from './fsal-file'
import * as FSALDir from './fsal-directory'
import * as FSALAttachment from './fsal-attachment'
import FSALWatchdog from './fsal-watchdog'
import FSALCache from './fsal-cache'
import hash from '../../../common/util/hash'
import sort from '../../../common/util/sort'
import {
  OtherFileDescriptor,
  DirDescriptor,
  MDFileDescriptor,
  MDFileMeta,
  AnyDescriptor,
  DescriptorType,
  MaybeRootMeta,
  WatchdogEvent,
  AnyMetaDescriptor,
  MaybeRootDescriptor
} from './types'

interface FSALState {
  openDirectory: DirDescriptor|null
  openFiles: MDFileDescriptor[]
  activeFile: MDFileDescriptor|null
  filetree: MaybeRootDescriptor[]
}

export default class FSAL extends EventEmitter {
  private readonly _cache: FSALCache
  private readonly _watchdog: FSALWatchdog
  private _isCurrentlyHandlingRemoteChange: boolean
  private _fsalIsBusy: boolean
  private readonly _remoteChangeBuffer: WatchdogEvent[]
  private _state: FSALState
  private readonly _actions: any

  constructor (cachedir: string) {
    super()
    global.log.verbose('FSAL booting up ...')
    this._cache = new FSALCache(path.join(cachedir, 'fsal/cache'))
    this._watchdog = new FSALWatchdog()
    this._isCurrentlyHandlingRemoteChange = false
    this._fsalIsBusy = false // Locks certain functionality during running of actions
    this._remoteChangeBuffer = [] // Holds events for later processing

    this._state = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      openFiles: [],
      activeFile: null, // Can contain an active file (active in the editor)
      filetree: [] // Contains the full filetree
    }

    // Finally, set up listeners for global targets
    global.targets.on('update', (hash: number) => {
      let file = this.findFile(hash)
      if (file === null) return // Not our business
      // Simply pull in the new target
      FSALFile.setTarget(file, global.targets.get(hash))
      this.emit('fsal-state-changed', 'file', {
        'oldHash': file.hash,
        'newHash': file.hash
      })
    })
    global.targets.on('remove', (hash: number) => {
      let file = this.findFile(hash)
      if (file === null) return // Also not our business
      FSALFile.setTarget(file, null) // Reset
      this.emit('fsal-state-changed', 'file', {
        'oldHash': file.hash,
        'newHash': file.hash
      })
    })

    this._watchdog.on('change', (event, changedPath) => {
      // Buffer the event for later
      this._remoteChangeBuffer.push({ 'event': event, 'path': changedPath })

      // Handle the buffer if we're not currently handling a change.
      if (!this._isCurrentlyHandlingRemoteChange && !this._fsalIsBusy) this._afterRemoteChange()
    })
  } // END constructor

  /**
   * Triggers on remote changes, detected by the FSAL watchdog.
   *
   * @param {string} event       The triggered event (equals chokidar event).
   * @param {string} changedPath The path on which this event was triggered.
   */
  private async _onRemoteChange (event: string, changedPath: string): Promise<void> {
    // Lock the function during processing
    this._isCurrentlyHandlingRemoteChange = true

    // Five possible events: unlink, unlinkDir, add, addDir, and change
    // In case of unlink, we have the descriptor loaded, in case of add
    // we need to search for the parent
    let descriptorHash: number
    let descriptor: AnyDescriptor|null = null
    if ([ 'change', 'unlink', 'unlinkDir' ].includes(event)) {
      descriptorHash = hash(changedPath)
      // It may be that an attachment was unlinked/changed. In this case make
      // sure to pull in its parent directory.
      if (isAttachment(changedPath, true)) descriptorHash = hash(path.dirname(changedPath))
      descriptor = this.find(descriptorHash)
    } else {
      // Both in case of add and addDir there'll
      // be a parent directory we have to find
      let dir = changedPath
      do {
        let oldDir = dir
        dir = path.dirname(dir)
        if (dir === oldDir) break // We've reached the top of the file system
        descriptorHash = hash(dir)
      } while ((descriptor = this.find(descriptorHash)) === null)
    }

    // Now we should definitely have a descriptor
    if (descriptor === null) {
      global.log.error('Could not process remote change, as no fitting descriptor was found', {
        'event': event,
        'path': changedPath
      })
      return
    }

    // Now we have a descriptor and an event to process. First, we need to
    // retrieve some information about our state. We need to do this beforehand
    // so that we can trigger these events *after* we have updated the internal
    // state, as otherwise some things might go wrong, especially if the
    // renderer receives an update event and does not yet have the necessary
    // state updates applied. isAddEvent helps us distinguish if we really need
    // to update the state or not.
    let isAddEvent: boolean = [ 'add', 'addDir' ].includes(event)
    let isRoot: boolean = this._state.filetree.includes(descriptor) && !isAddEvent
    let isOpenDir: boolean = descriptor === this._state.openDirectory && !isAddEvent
    let isOpenFile: boolean = this._state.openFiles.includes(descriptor as MDFileDescriptor) && !isAddEvent
    let rootIndex: number = -1
    if (event === 'unlinkDir' && isRoot) {
      rootIndex = this._state.filetree.indexOf(descriptor)
    }

    let isDirectoryUpdateNeeded = false
    let isFileUpdateNeeded = false
    let isTreeUpdateNeeded = false
    let directoryToUpdate: DirDescriptor|null = null
    let fileToUpdate: MDFileDescriptor|null = null

    // Now let's distinguish the different scenarios we need to handle
    if (isAttachment(changedPath, true)) {
      // The descriptor contains the parent directory of the attachment, and
      // it suffices to have it rescan its children, which we'll achieve by
      // simply reparsing the directory.
      let newdir = await FSALDir.parse(descriptor.path, this._cache, descriptor.parent)
      await FSALDir.sort(newdir)
      // We can't use isRoot, as it'll be false if it's an add-event
      if (this._state.filetree.includes(descriptor)) {
        let index = this._state.filetree.indexOf(descriptor)
        this._state.filetree.splice(index, 1, newdir)
        this._state.filetree = sort(this._state.filetree)
      } else if (descriptor.parent !== null) {
        let index = descriptor.parent.children.indexOf(descriptor as DirDescriptor)
        descriptor.parent.children.splice(index, 1, newdir)
      }
      isDirectoryUpdateNeeded = true
      directoryToUpdate = descriptor as DirDescriptor
    } else if (isRoot && event === 'unlinkDir') {
      // It's a directory and it has been removed -> remove it from the state
      this._state.filetree.splice(this._state.filetree.indexOf(descriptor), 1)
      isTreeUpdateNeeded = true
    } else if (event === 'add') {
      // It may be that the file is already present due to a directory
      // rename, so make sure not to add the thing twice.
      if ((descriptor as DirDescriptor).children.find(e => e.path === changedPath) === undefined) {
        // New file --> add it, trigger a dir update and be done with it
        let newfile: MDFileDescriptor = await FSALFile.parse(changedPath, this._cache, descriptor as DirDescriptor)
        ;(descriptor as DirDescriptor).children.push(newfile)
        await FSALDir.sort(descriptor as DirDescriptor)
        isDirectoryUpdateNeeded = true
        directoryToUpdate = descriptor as DirDescriptor
      }
    } else if (event === 'addDir') {
      // It may be that the directory is already present due to a rename,
      // so make sure not to add the thing twice.
      if ((descriptor as DirDescriptor).children.find(e => e.path === changedPath) === undefined) {
        // New directory --> same as above
        let newdir = await FSALDir.parse(changedPath, this._cache, descriptor as DirDescriptor)
        ;(descriptor as DirDescriptor).children.push(newdir)
        await FSALDir.sort(descriptor as DirDescriptor)
        isDirectoryUpdateNeeded = true
        directoryToUpdate = descriptor as DirDescriptor
      }
    } else if (event === 'change') {
      // We have to make sure the "change" event was appropriate
      // This is DEBUG as of now (See issue #773 for more information)
      let hasChanged = await FSALFile.hasChangedOnDisk(descriptor as MDFileDescriptor)
      if (!hasChanged) {
        global.log.info(`The file ${descriptor.name} has not changed, but a change event was fired by chokidar.`)
      } else {
        global.log.info(`Chokidar has detected a change event for file ${descriptor.name}. Attempting to re-parse ...`)
        // Remove the cached value
        this._cache.del(descriptor.hash.toString())

        // As we will be replacing the descriptor, remember to first remove all
        // tags from the provider as to prevent duplicates and wrong numbers.
        global.tags.remove((descriptor as MDFileDescriptor).tags)

        let newfile: MDFileDescriptor | null = null
        if ((descriptor as DirDescriptor).parent === null) {
          // A root file has changed
          newfile = await FSALFile.parse(changedPath, this._cache)
          this._state.filetree.splice(this._state.filetree.indexOf(descriptor), 1, newfile)
          this._state.filetree = sort(this._state.filetree)
        } else {
          // A non-root file has been changed (its contents) --> replace it
          let parent = (descriptor as DirDescriptor).parent
          if (parent !== null) {
            newfile = await FSALFile.parse(changedPath, this._cache, parent)
            parent.children.splice(parent.children.indexOf(descriptor as DirDescriptor), 1, newfile)
            await FSALDir.sort(parent)
          }
        }

        isFileUpdateNeeded = true
        fileToUpdate = newfile
        // In case the file was open, also replace it in the openFiles array
        if (isOpenFile && newfile !== null) {
          // Tell the editor to both update the open files and
          // the file contents of the new file
          this._state.openFiles.splice(this._state.openFiles.indexOf(descriptor as MDFileDescriptor), 1, newfile)
          this.emit('fsal-state-changed', 'fileContents', { 'hash': hash(changedPath) })
          this.emit('fsal-state-changed', 'openFiles')
        }
      }
    } else if ([ 'unlink', 'unlinkDir' ].includes(event)) {
      if (event === 'unlink') {
        global.tags.remove((descriptor as MDFileDescriptor).tags)
      }

      // A file or directory was removed
      if (descriptor.parent !== null) {
        descriptor.parent.children.splice(descriptor.parent.children.indexOf(descriptor), 1)
        isDirectoryUpdateNeeded = true
        directoryToUpdate = descriptor.parent
        // In case it was an open file, also replace it in the openFiles array
        if (isOpenFile) {
          this._state.openFiles.splice(this._state.openFiles.indexOf(descriptor as MDFileDescriptor), 1)
        }
      }
    }

    if (isOpenDir) { // The event in this case is guaranteed to be unlinkDir
      this._state.openDirectory = null // Unset
      // If it has not been a root directory, select its parent
      if (!isRoot) {
        this._state.openDirectory = descriptor.parent
      } else if (isRoot) {
        // It was a root directory, so we need to find another root dir
        if (rootIndex === this._state.filetree.length) {
          // Last directory has been removed, check if there are any before it
          let dirs = this._state.filetree.filter(dir => dir.type === DescriptorType.Directory) as DirDescriptor[]
          if (dirs.length > 0) this._state.openDirectory = dirs[dirs.length - 1]
        } else {
          // Either the first root or something in between has been removed -->
          // selecting the next sibling is safe, as directories are sorted
          // behind the files.
          this._state.openDirectory = this._state.filetree[rootIndex] as DirDescriptor
        }
      }
    } // END isOpenDir

    // Make sure to pull potential new openFiles from the filetree. There is a
    // variety of events that might change that list. We'll do this check here
    // after everything that might have changed has changed for good.
    this._consolidateOpenFiles()

    // Finally, trigger all necessary events
    if (isDirectoryUpdateNeeded && directoryToUpdate !== null) {
      this.emit('fsal-state-changed', 'directory', {
        'oldHash': directoryToUpdate.hash,
        'newHash': directoryToUpdate.hash
      })
    }

    if (isFileUpdateNeeded && fileToUpdate !== null) {
      this.emit('fsal-state-changed', 'file', {
        'oldHash': fileToUpdate.hash,
        'newHash': fileToUpdate.hash
      })
    }

    if (isTreeUpdateNeeded) {
      this.emit('fsal-state-changed', 'filetree')
    }

    this._isCurrentlyHandlingRemoteChange = false
    this._afterRemoteChange() // Trigger another processing event, if applicable
  }

  private _afterRemoteChange (): void {
    if (this._isCurrentlyHandlingRemoteChange || this._fsalIsBusy) {
      return // Let's wait for it to finish
    }

    // Called after a remote change has been handled.
    // Let's see if we still have events to handle
    let event = this._remoteChangeBuffer.shift()
    if (event !== undefined) {
      const isUnlink = [ 'unlink', 'unlinkDir' ].includes(event.event)
      const doesNotExist = !isFile(event.path) && !isDir(event.path)
      if (doesNotExist && !isUnlink) {
        global.log.info(`Could not process event ${event.event} for ${event.path}: The corresponding node does not exist anymore.`)
        return this._afterRemoteChange() // Try the next event
      }
      this._onRemoteChange(event.event, event.path).catch(e => global.log.error(e.message, e))
    }
  }

  /**
   * Re-fetches all open files from the current file tree. This is necessary if
   * a directory was re-read as the directory's children could (have) been open
   * and in that case one or more of the openFiles are not present in the
   * filetree anymore. This fixes that.
   */
  private _consolidateOpenFiles (): void {
    // Filter out non-existent files ...
    let oldHashes = [...this.openFiles]
    this.openFiles = oldHashes.filter(hash => {
      return this.findFile(hash) !== null
    })

    // ... and see if some are missing afterwards.
    if (this.openFiles.length !== oldHashes.length) {
      this.emit('fsal-state-changed', 'openFiles')
    }

    // Finally, check if the activeFile is now not present anymore, and remove
    // it if necessary.
    if (this.activeFile !== null && !this.openFiles.includes(this.activeFile)) {
      this.activeFile = null
      this.emit('fsal-state-changed', 'activeFile')
    }
  }

  /**
   * Shuts down the service provider.
   *
   * @returns {boolean} Whether or not the shutdown was successful
   */
  public async shutdown (): Promise<boolean> {
    global.log.verbose('FSAL shutting down ...')
    this._cache.persist()
    await this._watchdog.shutdown()
    return true
  }

  /**
   * Opens, reads, and parses a file to be loaded into the FSAL.
   * @param {String} filePath The file to be loaded
   */
  private async _loadFile (filePath: string): Promise<void> {
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
  private async _loadDir (dirPath: string): Promise<void> {
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
  private async _loadPlaceholder (dirPath: string): Promise<void> {
    // Load a "dead" directory
    console.log('Creating placeholder for dir ' + dirPath) // DEBUG
  }

  /**
   * Loads a given path into the FSAL.
   * @param {String} p The path to be loaded
   */
  public async loadPath (p: string): Promise<boolean> {
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

    this._state.filetree = sort(this._state.filetree)
    this.emit('fsal-state-changed', 'filetree')

    return true
  }

  /**
   * Unloads the complete FSAL, can be used
   * for preparation of a full reload.
   */
  public unloadAll (): void {
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
  public unloadPath (root: MaybeRootDescriptor): boolean {
    if (!this._state.filetree.includes(root)) {
      return false
    }

    // Set the open directory to an appropriate value
    if (this.openDirectory === root) {
      const rootIdx = this._state.filetree.indexOf(root)
      const dirAfter = this._state.filetree[rootIdx + 1]?.type === DescriptorType.Directory
      const dirBefore = this._state.filetree[rootIdx - 1]?.type === DescriptorType.Directory
      if (rootIdx === this._state.filetree.length - 1 && dirBefore) {
        this.openDirectory = this._state.filetree[rootIdx - 1] as DirDescriptor
      } else if (rootIdx >= 0 && dirAfter) {
        this.openDirectory = this._state.filetree[rootIdx + 1] as DirDescriptor
      } else {
        this.openDirectory = null
      }
    }

    if (this.openFiles.includes(root.hash) && root.type === DescriptorType.MDFile) {
      // It's an open root file --> close before splicing from the tree
      this.closeFile(root as MDFileDescriptor)
    }

    this._state.filetree.splice(this._state.filetree.indexOf(root), 1)
    this.emit('fsal-state-changed', 'filetree')
    this._watchdog.unwatch(root.path)

    // Make sure to keep the openFiles array updated.
    this._consolidateOpenFiles()
    return true
  }

  /**
   * Called by the main object once to set the open files for the editor to pull.
   * @param {Array} fileArray An array with hashes to open
   */
  public set openFiles (fileArray: number[]) {
    let files = fileArray.map(f => this.findFile(f))
    let safeFiles = files.filter(elem => elem != null) as MDFileDescriptor[]
    this._state.openFiles = safeFiles
    this.emit('fsal-state-changed', 'openFiles')

    // Make sure the config is consistent and we remove non-existent files
    // TODO: Move to application
    global.config.set('openFiles', this.openFiles)
  }

  /**
   * Returns a list of hashes for all open files
   */
  public get openFiles (): number[] {
    return this._state.openFiles.map(elem => elem.hash)
  }

  /**
   * Sorts the openFiles according to hashArray, and returns the new sorting.
   * @param {Array} hashArray An array with hashes to sort with
   * @return {Array} The new sorting
   */
  public sortOpenFiles (hashArray: number[]): MDFileDescriptor[] {
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

    this._state.openFiles = newSorting as MDFileDescriptor[]
    this.emit('fsal-state-changed', 'openFiles')
    return newSorting as MDFileDescriptor[]
  }

  /**
   * Returns a file's metadata including the contents.
   * @param {Object} file The file descriptor
   */
  public openFile (file: MDFileDescriptor): boolean {
    if (this._state.openFiles.includes(file)) return false
    if (file.type !== 'file') return false
    this._state.openFiles.push(file)
    this.emit('fsal-state-changed', 'openFiles')
    return true
  }

  /**
   * Closes a given file.
   * @param {Object} file The file descriptor
   */
  public closeFile (file: MDFileDescriptor): boolean {
    if (this._state.openFiles.includes(file)) {
      this._state.openFiles.splice(this._state.openFiles.indexOf(file), 1)
      this.emit('fsal-state-changed', 'openFiles')
      return true
    } else {
      return false
    }
  }

  /**
   * Closes all open files.
   */
  public closeAllFiles (): void {
    this._state.openFiles = []
    this.emit('fsal-state-changed', 'openFiles')
  }

  /**
   * Sets the active file to the given hash or null.
   * @param {number|null} hash The hash of the file to set as active
   */
  public set activeFile (hash: number|null) {
    if (hash === null && this._state.activeFile !== null) {
      this._state.activeFile = null
      this.emit('fsal-state-changed', 'activeFile')
    } else if (hash !== null && hash !== this.activeFile) {
      let file = this.findFile(hash)
      if (file !== null && this._state.openFiles.includes(file)) {
        this._state.activeFile = file
        this.emit('fsal-state-changed', 'activeFile')
      }
    } // Else: No update necessary
  }

  /**
   * Returns the hash of the currently active file.
   * @returns {number|null} The hash of the active file.
   */
  public get activeFile (): number|null {
    return (this._state.activeFile !== null) ? this._state.activeFile.hash : null
  }

  /**
   * Returns a file metadata object including the file contents.
   * @param {Object} file The file descriptor
   */
  public async getFileContents (file: MDFileDescriptor): Promise<MDFileMeta> {
    let returnFile = FSALFile.metadata(file)
    returnFile.content = await FSALFile.load(file)
    return returnFile
  }

  /**
   * Sets the modification flag on an open file
   */
  public markDirty (file: MDFileDescriptor): void {
    if (!this._state.openFiles.includes(file)) {
      console.error('Cannot mark dirty a non-open file!')
      return
    }

    FSALFile.markDirty(file)
  }

  /**
   * Removes the modification flag on an open file
   */
  public markClean (file: MDFileDescriptor): void {
    if (!this._state.openFiles.includes(file)) {
      console.error('Cannot mark clean a non-open file!')
      return
    }

    FSALFile.markClean(file)
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   */
  public isClean (): boolean {
    for (let openFile of this._state.openFiles) {
      if (openFile.modified) return false
    }
    return true
  }

  /**
   * Returns a lean directory tree, ready to be stringyfied for IPC calls.
   */
  public getTreeMeta (): MaybeRootMeta[] {
    let ret = []
    for (let root of this._state.filetree) {
      ret.push(this.getMetadataFor(root))
    }

    // We know there are no undefines in here, so give to correct type
    return ret as MaybeRootMeta[]
  }

  /**
   * Returns a metadata object for the given descriptor
   *
   * @param   {AnyDescriptor}  descriptor  The descriptor to return metadata for
   *
   * @return  {AnyMetaDescriptor}          The metadata for that descriptor
   */
  public getMetadataFor (descriptor: AnyDescriptor): AnyMetaDescriptor|undefined {
    if (descriptor.type === DescriptorType.Directory) return FSALDir.metadata(descriptor as DirDescriptor)
    if (descriptor.type === DescriptorType.MDFile) return FSALFile.metadata(descriptor as MDFileDescriptor)
    if (descriptor.type === DescriptorType.Other) return FSALAttachment.metadata(descriptor as OtherFileDescriptor)
    return undefined
  }

  /**
   * Attempts to find a directory in the FSAL. Returns null if not found.
   *
   * @param  {string|number}           val  Either an absolute path or a hash
   *
   * @return {DirDescriptor|null}       Either null or the wanted directory
   */
  public findDir (val: string|number, baseTree = this._state.filetree): DirDescriptor|null {
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
  public findFile (val: string|number, baseTree = this._state.filetree): MDFileDescriptor|null {
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
   * Convenience wrapper for findFile && findDir
   * @param {number|string} val The value to search for (hash or path)
   */
  public find (val: number|string): MDFileDescriptor|DirDescriptor|null {
    let res = this.findFile(val)
    if (res === null) return this.findDir(val)
    return res
  }

  /**
   * Searches for a file with the exact name as given,
   * accounting for missing endings.
   * @param {String} name The file name to be searched for
   */
  public findExact (query: string, property: string = 'name'): MDFileDescriptor {
    return findObject(this._state.filetree, property, query, 'children')
  }

  /**
   * Returns true, if the haystack contains a descriptor with the same name as needle.
   * @param {DirDescriptor} haystack A dir descriptor
   * @param {MDFileDescriptor|DirDescriptor} needle A file or directory descriptor
   */ // TODO: Only Directories!
  public hasChild (haystack: DirDescriptor, needle: MDFileDescriptor|DirDescriptor): boolean {
    // Hello, PHP
    // If a name checks out, return true
    for (let child of (haystack).children) {
      if (child.name.toLowerCase() === needle.name.toLowerCase()) return true
    }

    return false
  }

  public set openDirectory (dirObject: DirDescriptor | null) {
    this._state.openDirectory = dirObject
    this.emit('fsal-state-changed', 'openDirectory')
  }

  public get openDirectory (): DirDescriptor|null {
    return this._state.openDirectory
  }

  /**
   * Clears the cache
   */
  public clearCache (): void {
    return this._cache.clearCache()
  }

  // WAS: SORT
  public async sortDirectory (src: DirDescriptor, sorting: string = ''): Promise<void> {
    this._fsalIsBusy = true
    await FSALDir.sort(src, sorting)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: CREATE-FILE
  public async createFile (src: DirDescriptor, options: any): Promise<void> {
    this._fsalIsBusy = true
    // This action needs the cache because it'll parse a file
    // NOTE: Generates an add-event
    this._watchdog.ignoreEvents([{
      'event': 'add',
      'path': path.join(src.path, options.name)
    }])
    await FSALDir.createFile(src, options, this._cache)
    await this.sortDirectory(src)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: RENAME-FILE
  public async renameFile (src: MDFileDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add
    let oldHash = src.hash
    let isOpenFile = this._state.openFiles.find(e => e.hash === oldHash) !== undefined
    let isActiveFile = this._state.activeFile === src

    this._watchdog.ignoreEvents([{
      'event': 'unlink',
      'path': src.path
    }])
    this._watchdog.ignoreEvents([{
      'event': 'add',
      'path': path.join(path.dirname(src.path), newName)
    }])

    await FSALFile.rename(src, this._cache, newName)
    // Now we need to re-sort the parent directory
    if (src.parent !== null) {
      await FSALDir.sort(src.parent) // Omit sorting
    }

    // Notify of a state change
    this.emit('fsal-state-changed', 'filetree')
    if (isActiveFile) this.emit('fsal-state-changed', 'activeFile')
    // If applicable, trigger a file synchronisation
    if (isOpenFile) this.emit('fsal-state-changed', 'openFiles')
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: REMOVE-FILE
  public async removeFile (src: MDFileDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink
    // First remove the file
    this._watchdog.ignoreEvents([{
      'event': 'unlink',
      'path': src.path
    }])
    // Will trigger a change that syncs the files
    this.closeFile(src) // Does nothing if the file is not open

    // Now we're safe to remove the file actually.
    await FSALFile.remove(src)

    // In case it was a root file, we need to splice it
    if (src.parent === null) {
      this.unloadPath(src)
    } else {
      // If it was not, we need to issue a directory update
      this.emit('fsal-state-changed', 'directory', {
        oldHash: src.parent.hash,
        newHash: src.parent.hash
      })
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: SAVE-FILE
  public async saveFile (src: MDFileDescriptor, content: string): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x change
    this._watchdog.ignoreEvents([{ 'event': 'change', 'path': src.path }])
    await FSALFile.save(src, content, this._cache)
    // Notify that a file has saved, which strictly speaking does not
    // modify the openFiles array, but does change the modification flag.
    this.emit('fsal-state-changed', 'fileSaved', { fileHash: src.hash })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: SEARCH-FILE
  public async searchFile (src: MDFileDescriptor, searchTerms: any): Promise<any> { // TODO: Implement search results type
    // NOTE: Generates no events
    // Searches a file and returns the result
    return await FSALFile.search(src, searchTerms)
  }

  // WAS: SET-DIRECTORY-SETTING
  public async setDirectorySetting (src: DirDescriptor, settings: any): Promise<void> {
    this._fsalIsBusy = true
    // Sets a setting on the directory
    await FSALDir.setSetting(src, settings)
    // Notify the renderer
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: CREATE-PROJECT
  public async createProject (src: DirDescriptor, initialProps: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.makeProject(src, initialProps)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: UPDATE-PROJECT
  public async updateProject (src: DirDescriptor, options: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    // Updates the project properties on a directory.
    await FSALDir.updateProjectProperties(src, options)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: REMOVE-PROJECT
  public async removeProject (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.removeProject(src)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: CREATE-DIRECTORY
  public async createDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // Parses a directory and henceforth needs the cache
    // NOTE: Generates 1x add
    const absolutePath = path.join(src.path, newName)

    if (this.find(absolutePath) !== null) {
      // We already have such a dir or file
      throw new Error(`An object already exists at path ${absolutePath}!`)
    }

    this._watchdog.ignoreEvents([{
      'event': 'addDir',
      'path': absolutePath
    }])

    await FSALDir.create(src, newName, this._cache)

    // Notify the event listeners
    this.emit('fsal-state-changed', 'directory', {
      'oldHash': src.hash,
      'newHash': src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: RENAME-DIRECTORY
  public async renameDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // We are probably going to need that code from the move action
    let openFilesUpdateNeeded = false
    let newActiveFileHash
    let newFileHashes = []

    // Compute the paths to be replaced
    let oldPrefix = path.join(src.dir, src.name)
    let newPrefix = path.join(src.dir, newName)

    // Check the open files if something needs to change concerning them.
    for (const fileHash of this.openFiles) {
      let found = this.findFile(fileHash, [src])
      if (found !== null) {
        // The file is in the directory, so we need to update the open files
        openFilesUpdateNeeded = true
        // Exchange the old directory path for the new one and compute
        // its new hash
        let newHash = hash(found.path.replace(oldPrefix, newPrefix))
        newFileHashes.push(newHash)
      } else {
        // File will not be renamed, so retain the hash
        newFileHashes.push(fileHash)
      }
    }

    // We also need to make sure to re-set the active file if necessary
    if (this.activeFile !== null) {
      const maybeActiveFile = this.findFile(this.activeFile, [src])
      if (maybeActiveFile !== null) {
        newActiveFileHash = hash(maybeActiveFile.path.replace(oldPrefix, newPrefix))
      }
    }

    // Now that we have prepared potential updates,
    // let us perform the rename.
    // NOTE: Generates 1x unlink, 1x add for each child + src!
    let adds = []
    let removes = []
    for (const child of objectToArray(src, 'children')) {
      adds.push({
        'event': child.type === DescriptorType.MDFile ? 'add' : 'addDir',
        // Converts /old/path/oldname/file.md --> /old/path/newname/file.md
        'path': child.path.replace(oldPrefix, newPrefix)
      })
      removes.push({
        'event': child.type === DescriptorType.MDFile ? 'unlink' : 'unlinkDir',
        'path': child.path
      })
    }

    // Now concat the removes in reverse direction and ignore them
    this._watchdog.ignoreEvents(adds.concat(removes))
    const newDir = await FSALDir.rename(src, newName, this._cache)

    if (src.parent === null) {
      // Exchange the directory in the filetree
      let index = this._state.filetree.indexOf(src)
      this._state.filetree.splice(index, 1, newDir)
      this._state.filetree = sort(this._state.filetree)
      this.emit('fsal-state-changed', 'filetree')
    } else {
      // Update the parent
      this.emit('fsal-state-changed', 'directory', {
        'oldHash': src.parent.hash,
        'newHash': src.parent.hash
      })
    }

    // Cleanup: Re-set anything within the state that has changed due to this

    // If it was the openDirectory, reinstate it
    if (this.openDirectory === src) {
      this.openDirectory = newDir
      this.emit('fsal-state-changed', 'openDirectory')
    }

    // Update open files and the active file
    if (openFilesUpdateNeeded) {
      this.openFiles = newFileHashes
      this._consolidateOpenFiles()
    }

    if (newActiveFileHash !== undefined) {
      this.activeFile = newActiveFileHash
      this.emit('fsal-state-changed', 'activeFile')
    }

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: REMOVE-DIRECTORY
  public async removeDir (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink for each child + src!
    let arr = objectToArray(src, 'children').map(e => {
      return {
        'event': e.type === 'file' ? 'unlink' : 'unlinkDir',
        'path': e.path
      }
    })

    this._watchdog.ignoreEvents(arr.concat({
      'event': 'unlinkDir',
      'path': src.path
    }))

    await FSALDir.remove(src)

    // Clean up after removing
    if (this._state.filetree.includes(src)) {
      // If it's a root, unload it, which emits an event
      // and also consolidates the open files
      this.unloadPath(src)
    } else {
      // Not a root directory. It can still be the open directory.
      if (this.openDirectory === src) {
        // Sets the parent as the openDir
        this.openDirectory = src.parent
        this._consolidateOpenFiles()
      }

      // In any case, we need to update the parent directory (so that it
      // doesn't include the old dir anymore.
      this.emit('fsal-state-changed', 'directory', {
        oldHash: (src.parent as DirDescriptor).hash,
        newHash: (src.parent as DirDescriptor).hash
      })
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  // WAS: move
  public async move (src: AnyDescriptor, target: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add for each child, src and on the target!
    let openFilesUpdateNeeded = false
    let activeFileUpdateNeeded = false
    let newOpenDirHash
    let newFileHashes: number[] = []
    const hasOpenDir = this.openDirectory !== null
    const srcIsDir = src.type === DescriptorType.Directory
    const srcIsFile = src.type === DescriptorType.MDFile
    const srcIsOpenDir = src === this.openDirectory
    const srcContainsOpenDir = srcIsDir && hasOpenDir && this.findDir((this.openDirectory as DirDescriptor).hash, [src as DirDescriptor]) !== null
    const srcContainsActiveFile = srcIsDir && this.activeFile !== null && this.findFile(this.activeFile, [src as DirDescriptor]) !== null

    // First, check if the openFiles need updates after the action
    if (srcIsDir) {
      // A directory is being moved, so check the open files if something
      // needs to change concerning them.
      for (let fileHash of this.openFiles) {
        let found = this.findFile(fileHash, [src as DirDescriptor])
        if (found !== null) {
          // The file is in there, so we need to update the open files
          openFilesUpdateNeeded = true
          // Exchange the old directory path for the new one and compute
          // its new hash
          let newHash = hash(found.path.replace(src.dir, target.path))
          newFileHashes.push(newHash)
        } else {
          // Nothing really to do
          newFileHashes.push(fileHash)
        }
      }
    } else if (srcIsFile) {
      if (this.openFiles.includes(src.hash)) {
        // The source is an open file, we need to account for that.
        openFilesUpdateNeeded = true
        let newHash = hash(src.path.replace(src.dir, target.path))
        newFileHashes = this.openFiles
        newFileHashes.splice(newFileHashes.indexOf(src.hash), 1, newHash)
      }
    }

    // Then we also need to make sure to re-set the active file, if it's contained
    // somewhere here
    if (srcContainsActiveFile) {
      const activeFile = this.findFile(this.activeFile as number) as MDFileDescriptor
      this.activeFile = hash(activeFile.path.replace(src.dir, target.path))
      activeFileUpdateNeeded = true
    }

    // Next, check if the open directory is affected
    if (srcIsOpenDir || srcContainsOpenDir) {
      // Compute the new hash and indicate an update is necessary
      newOpenDirHash = hash((this.openDirectory as DirDescriptor).path.replace(src.dir, target.path))
    }

    // Now we need to generate the ignore events that are to be expected.
    let sourcePath = src.path
    let targetPath = path.join(target.path, src.name)
    let arr = objectToArray(src, 'children')
    let adds = []
    let removes = []
    for (let obj of arr) {
      adds.push({
        'event': obj.type === DescriptorType.MDFile ? 'add' : 'addDir',
        // Converts /path/source/file.md --> /path/target/file.md
        'path': obj.path.replace(sourcePath, targetPath)
      })
      removes.push({
        'event': obj.type === DescriptorType.MDFile ? 'unlink' : 'unlinkDir',
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
      'oldHash': src.parent?.hash, // NOTE that src still points to the old location
      'newHash': src.parent?.hash
    })
    this.emit('fsal-state-changed', 'directory', {
      // We cannot move into files, so target WILL be a directory
      'oldHash': target.hash,
      'newHash': target.hash
    })

    // Afterwards, let's see if we have to change something. These
    // functions will notify the application respectively.
    if (openFilesUpdateNeeded) this.openFiles = newFileHashes
    if (newOpenDirHash !== undefined) this.openDirectory = this.findDir(newOpenDirHash)
    if (activeFileUpdateNeeded) this.emit('fsal-state-changed', 'activeFile')
    this._fsalIsBusy = false
    this._afterRemoteChange()
  } // END: move-action
}
