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
import * as FSALCodeFile from './fsal-code-file'
import * as FSALDir from './fsal-directory'
import * as FSALAttachment from './fsal-attachment'
import FSALWatchdog from './fsal-watchdog'
import FSALCache from './fsal-cache'
import hash from '../../../common/util/hash'
import sort from './util/sort'
import {
  DirDescriptor,
  MDFileDescriptor,
  MDFileMeta,
  AnyDescriptor,
  MaybeRootMeta,
  WatchdogEvent,
  AnyMetaDescriptor,
  MaybeRootDescriptor,
  CodeFileDescriptor,
  CodeFileMeta,
  OtherFileDescriptor
} from './types'

const ALLOWED_CODE_FILES = [
  '.tex'
]

const MARKDOWN_FILES = [
  '.md',
  '.rmd',
  '.markdown',
  '.txt'
]

interface FSALState {
  openDirectory: DirDescriptor|null
  openFiles: Array<MDFileDescriptor|CodeFileDescriptor>
  activeFile: MDFileDescriptor|CodeFileDescriptor|null
  filetree: MaybeRootDescriptor[]
}

/**
 * Declares an event that happens on the FSAL
 */
interface FSALHistoryEvent {
  event: 'add'|'change'|'remove'
  path: string
  timestamp: number
}

export default class FSAL extends EventEmitter {
  private readonly _cache: FSALCache
  private readonly _watchdog: FSALWatchdog
  private _isCurrentlyHandlingRemoteChange: boolean
  private _fsalIsBusy: boolean
  private readonly _remoteChangeBuffer: WatchdogEvent[]
  private _state: FSALState
  private readonly _history: FSALHistoryEvent[]

  constructor (cachedir: string) {
    super()
    global.log.verbose('FSAL booting up ...')
    this._cache = new FSALCache(path.join(cachedir, 'fsal/cache'))
    this._watchdog = new FSALWatchdog()
    this._isCurrentlyHandlingRemoteChange = false
    this._fsalIsBusy = false // Locks certain functionality during running of actions
    this._remoteChangeBuffer = [] // Holds events for later processing
    this._history = []

    this._state = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      openFiles: [],
      activeFile: null, // Can contain an active file (active in the editor)
      filetree: [] // Contains the full filetree
    }

    // Finally, set up listeners for global targets
    global.targets.on('update', (filePath: string) => {
      let file = this.findFile(filePath)
      if (file === null || file.type !== 'file') return // Not our business
      // Simply pull in the new target
      FSALFile.setTarget(file, global.targets.get(filePath))
      this._recordFiletreeChange('change', file.path)
    })
    global.targets.on('remove', (filePath: string) => {
      let file = this.findFile(filePath)
      if (file === null || file.type !== 'file') return // Also not our business
      FSALFile.setTarget(file, undefined) // Reset
      this._recordFiletreeChange('change', file.path)
    })

    this._watchdog.on('change', (event, changedPath) => {
      // Buffer the event for later
      this._remoteChangeBuffer.push({ 'event': event, 'path': changedPath })

      // Handle the buffer if we're not currently handling a change.
      if (!this._isCurrentlyHandlingRemoteChange && !this._fsalIsBusy) this._afterRemoteChange()
    })
  } // END constructor

  /**
   * Adds an event to the filetree history and emits an event to notify consumers.
   *
   * @param   {add|remove|change}  event        The event type
   * @param   {string}             changedPath  The affected path
   * @param   {number}             timestamp    The timestamp at which this event occurred
   */
  private _recordFiletreeChange (event: 'add'|'remove'|'change', changedPath: string, timestamp: number = Date.now()): void {
    // If there are events in the history, make sure the timestamps are *unique*
    // Especially since we are sometimes emitting events within the same same
    // function, this causes the timestamp parameter of this function to have
    // the same value for some events. With this little check we make sure that
    // each event has a unique timestamp.
    if (this._history.length > 0) {
      const lastEvent = this._history[this._history.length - 1]
      if (lastEvent.timestamp >= timestamp) {
        timestamp = lastEvent.timestamp + 1
      }
    }

    this._history.push({
      event: event,
      path: changedPath,
      timestamp: timestamp
    })

    this.emit('fsal-state-changed', 'filetree', changedPath)
  }

  /**
   * Retrieves all history events after the given time.
   *
   * @param   {number}              time  The timestamp marker
   *
   * @return  {FSALHistoryEvent[]}        The events after the given time
   */
  filetreeHistorySince (time: number = Date.now()): FSALHistoryEvent[] {
    const idx = this._history.findIndex(event => event.timestamp > time)
    if (idx === -1) {
      return [] // The caller is already up to date
    } else {
      return this._history.slice(idx)
    }
  }

  /**
   * Triggers on remote changes, detected by the FSAL watchdog.
   *
   * @param {string} event       The triggered event (equals chokidar event).
   * @param {string} changedPath The path on which this event was triggered.
   */
  private async _onRemoteChange (event: string, changedPath: string): Promise<void> {
    // Lock the function during processing
    this._isCurrentlyHandlingRemoteChange = true

    // NOTE: We can be certain of the following things:
    // 1. It is an event that occurred within our watched scope
    // 2. It pertains a file or directory that Zettlr should care about (root,
    //    non-root, attachments) -- this is made sure by the watchdog that
    //    forwards only applicable events.
    // 3. Whatever this change entails, we did not incur it ourselves and MUST
    //    therefore handle it.

    if ([ 'unlink', 'unlinkDir' ].includes(event)) {
      // A file or a directory has been removed.
      const descriptor = this.find(changedPath)
      let rootDirectoryIndex = -1 // Only necessary if the open dir has been removed
      if (descriptor === null) {
        // It must have been an attachment
        const parentPath = path.dirname(changedPath)
        const containingDirectory = this.find(parentPath) as DirDescriptor
        FSALDir.removeAttachment(containingDirectory, changedPath)
      } else {
        // It is a normal file or directory
        if (descriptor.parent === null) {
          // It was a root
          const idx = this._state.filetree.findIndex(element => element.path === changedPath)
          this._state.filetree.splice(idx, 1)
          rootDirectoryIndex = idx // Remember the index
        } else {
          // It was not a root
          FSALDir.removeChild(descriptor.parent, changedPath)
        }
      }

      // Before we are finished, make sure to remove the changed file/directory
      // from our state.
      const openDir = this._state.openDirectory
      if (openDir !== null && openDir.path === changedPath) {
        this._state.openDirectory = null
        if (openDir.parent !== null) {
          this._state.openDirectory = openDir.parent
        } else if (rootDirectoryIndex === this._state.filetree.length) {
          // Last directory has been removed, check if there are any before it
          let dirs = this._state.filetree.filter(dir => dir.type === 'directory') as DirDescriptor[]
          if (dirs.length > 0) {
            this._state.openDirectory = dirs[dirs.length - 1]
          }
        } else {
          // Either the first root or something in between has been removed -->
          // selecting the next sibling is safe, as directories are sorted
          // behind the files.
          this._state.openDirectory = this._state.filetree[rootDirectoryIndex] as DirDescriptor
        }
      }

      // If a file was removed, make sure to remove it from the open files
      // array if applicable.
      this._consolidateOpenFiles()

      // Finally, add a history event of what has happened
      this._recordFiletreeChange('remove', changedPath)
    } else if ([ 'add', 'addDir' ].includes(event)) {
      // A file or a directory has been added. It can not be a root.
      const parentDescriptor = this.find(path.dirname(changedPath)) as DirDescriptor
      if (isAttachment(changedPath)) {
        await FSALDir.addAttachment(parentDescriptor, changedPath)
      } else {
        await FSALDir.addChild(parentDescriptor, changedPath, this._cache)
      }
      // Finally, add a history event of what has happened
      this._recordFiletreeChange('add', changedPath)
    } else if (['change'].includes(event)) {
      // A file has been modified. Can be an attachment, a MD file, or a code file
      const affectedDescriptor = this.find(changedPath) as AnyDescriptor
      if (affectedDescriptor.type === 'code') {
        await FSALCodeFile.reparseChangedFile(affectedDescriptor, this._cache)
      } else if (affectedDescriptor.type === 'file') {
        await FSALFile.reparseChangedFile(affectedDescriptor, this._cache)
      } else if (affectedDescriptor.type === 'other') {
        await FSALAttachment.reparseChangedFile(affectedDescriptor)
      }
      // Finally, add a history event of what has happened
      this._recordFiletreeChange('change', changedPath)
      // Also notify the main process which will then check if we need to issue
      // a content-replacement.
      if ([ 'code', 'file' ].includes(affectedDescriptor.type)) {
        this.emit('fsal-state-changed', 'openFileRemotelyChanged', changedPath)
      }
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
    // First, save the index of the active file for later
    const activeIdx = this.openFiles.findIndex(file => file.path === this.activeFile)
    // Filter out non-existent files (retaining untitled ones) ...
    const oldFiles = this.openFiles.map(file => (file.dir === ':memory:') ? file : file.path)

    this.openFiles = oldFiles
      .map(fileOrPath => {
        if (typeof fileOrPath === 'string') {
          return this.findFile(fileOrPath)
        } else {
          return fileOrPath
        }
      })
      .filter(file => file !== null) as Array<MDFileDescriptor|CodeFileDescriptor>

    // ... and see if some are missing afterwards.
    if (this.openFiles.length !== oldFiles.length) {
      this.emit('fsal-state-changed', 'openFiles')
    }

    // Finally, check if the activeFile is now not present anymore, and remove
    // it if necessary.
    if (this.activeFile !== null && this.openFiles.find(file => file.path === this.activeFile) === undefined) {
      // Instead of setting it to null, we should attempt to find another file
      // which we can make active. Zettlr is designed so that the editor always
      // contains something. I realised that sometimes after closing or removing
      // files, the editor still showed the old file, but no tab was active. And
      // that's not desirable. So we're basically copying over the code from
      // the mounted-function of Tabs.vue.
      if (this.openFile.length > 0) {
        if (activeIdx >= this.openFiles.length) {
          this.activeFile = this.openFiles[this.openFiles.length - 1].path
        } else if (activeIdx > -1) {
          this.activeFile = this.openFiles[activeIdx].path
        } else {
          global.log.error('[FSAL] Unexpected value: The active file was set but has not been found before consolidating the open files.', this.activeFile)
          this.activeFile = this.openFiles[0].path
        }
      } else {
        // No open files, so reset
        this.activeFile = null
      }
      this.emit('fsal-state-changed', 'activeFile')
    }
  }

  /**
   * Simlarily to consolidateOpenFiles, this function takes all open root files
   * and checks whether they are not actually root files, but contained within
   * one of the loaded workspaces. This is necessary because it is sometimes
   * easier to just dump certain files onto the disk and clean up later (instead
   * of manually searching for their prospective root directories and adding the
   * files there).
   *
   * Also, if a user opens first a root file and later on decides to open the
   * whole directory, this function takes care to pluck the root files and put
   * them where they belong.
   */
  private _consolidateRootFiles (): void {
    // First, retrieve all root files
    const roots = this._state.filetree.filter(elem => elem.type !== 'directory')

    // Secondly, see if we can find the containing directories somewhere in our
    // filetree.
    for (const root of roots) {
      const dir = this.findDir(root.dir)

      if (dir !== null) {
        // The directory is, in fact loaded! So first we can pluck that file
        // from our filetree.
        const idx = this._state.filetree.indexOf(root)
        this._state.filetree.splice(idx, 1)
        // In order to reflect this change in consumers of the filetree, we
        // first need to remove the file so that consumers remove it from their
        // filetree, before "adding" it again. The time they execute the second
        // change, they will actually pull the "correct" element from within the
        // loaded workspace rather than the "root" element.
        // NOTE that this logic relies upon the fact that root files will be
        // searched before the directory tree, so DON'T you change that ever!
        this._recordFiletreeChange('remove', root.path)
        this._recordFiletreeChange('add', root.path)
      }
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
    const isCode = ALLOWED_CODE_FILES.includes(path.extname(filePath).toLowerCase())
    const isMD = MARKDOWN_FILES.includes(path.extname(filePath).toLowerCase())

    if (isCode) {
      let file = await FSALCodeFile.parse(filePath, this._cache)
      this._state.filetree.push(file)
      this._recordFiletreeChange('add', filePath)
    } else if (isMD) {
      let file = await FSALFile.parse(filePath, this._cache)
      this._state.filetree.push(file)
      this._recordFiletreeChange('add', filePath)
    }
  }

  /**
   * Loads a directory tree into the FSAL recursively.
   * @param {String} dirPath The dir to be loaded
   */
  private async _loadDir (dirPath: string): Promise<void> {
    // Loads a directory
    let dir = await FSALDir.parse(dirPath, this._cache, null)
    this._state.filetree.push(dir)
    this._recordFiletreeChange('add', dirPath)
  }

  /**
   * Loads a non-existent directory into the FSAL using dummy data.
   * @param {String} dirPath The directory
   */
  private async _loadPlaceholder (dirPath: string): Promise<void> {
    // Load a "dead" directory
    let dir: DirDescriptor = FSALDir.getDirNotFoundDescriptor(dirPath)
    this._state.filetree.push(dir)
    this._recordFiletreeChange('add', dirPath)
  }

  public async rescanForDirectory (descriptor: DirDescriptor): Promise<void> {
    // Rescans a not found directory and, if found, replaces the directory
    // descriptor.
    if (isDir(descriptor.path)) {
      // Remove this descriptor, and have the FSAL load the real one
      const idx = this._state.filetree.indexOf(descriptor)
      this._state.filetree.splice(idx, 1)
      this._recordFiletreeChange('remove', descriptor.path)
      global.log.info(`Directory ${descriptor.name} found - Adding to file tree ...`)
      await this.loadPath(descriptor.path)
    } else {
      global.log.info(`Rescanned directory ${descriptor.name}, but the directory still does not exist.`)
      // TODO: We need to provide user feedback --> make this function resolve to a Boolean or something.
    }
  }

  /**
   * Loads a given path into the FSAL.
   * @param {String} p The path to be loaded
   */
  public async loadPath (p: string): Promise<boolean> {
    // Load a path
    let start = Date.now()
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

    if (Date.now() - start > 500) {
      global.log.warning(`[FSAL] Path ${p} took ${Date.now() - start}ms to load.`)
    }

    this._state.filetree = sort(this._state.filetree)

    this._consolidateRootFiles()

    return true
  }

  /**
   * Unloads the complete FSAL, can be used
   * for preparation of a full reload.
   */
  public unloadAll (): void {
    for (let p of Object.keys(this._state.filetree)) {
      this._watchdog.unwatch(p)
      this._recordFiletreeChange('remove', p)
    }

    this._state.filetree = []
    this._state.openFiles = []
    this._state.openDirectory = null
    this._state.activeFile = null

    // Emit as if there was no morning after!
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
      const dirAfter = this._state.filetree[rootIdx + 1]?.type === 'directory'
      const dirBefore = this._state.filetree[rootIdx - 1]?.type === 'directory'
      if (rootIdx === this._state.filetree.length - 1 && dirBefore) {
        this.openDirectory = this._state.filetree[rootIdx - 1] as DirDescriptor
      } else if (rootIdx >= 0 && dirAfter) {
        this.openDirectory = this._state.filetree[rootIdx + 1] as DirDescriptor
      } else {
        this.openDirectory = null
      }
    }

    if (root.type !== 'directory' && this.openFiles.includes(root)) {
      // It's an open root file --> close before splicing from the tree
      this.closeFile(root)
    }

    this._state.filetree.splice(this._state.filetree.indexOf(root), 1)
    this._watchdog.unwatch(root.path)
    this._recordFiletreeChange('remove', root.path)

    // Make sure to keep the openFiles array updated.
    this._consolidateOpenFiles()
    return true
  }

  /**
   * Called by the main object once to set the open files for the editor to pull.
   * @param {Array} fileArray An array with paths to open
   */
  public set openFiles (files: Array<MDFileDescriptor|CodeFileDescriptor>) {
    this._state.openFiles = files
    this.emit('fsal-state-changed', 'openFiles')
  }

  /**
   * Returns a list of paths for all open files
   */
  public get openFiles (): Array<MDFileDescriptor|CodeFileDescriptor> {
    return this._state.openFiles
  }

  /**
   * Sorts the openFiles according to hashArray, and returns the new sorting.
   * @param {Array} hashArray An array with hashes to sort with
   * @return {Array} The new sorting
   */
  public sortOpenFiles (pathArray: string[]): Array<MDFileDescriptor|CodeFileDescriptor> {
    if (Array.isArray(pathArray)) {
      // Simply re-sort based on the new paths
      this._state.openFiles.sort((a, b) => {
        return pathArray.indexOf(a.path) - pathArray.indexOf(b.path)
      })

      this.emit('fsal-state-changed', 'openFiles')
    }

    return this._state.openFiles
  }

  /**
   * Returns a file's metadata including the contents.
   * @param {Object} file The file descriptor
   */
  public openFile (file: MDFileDescriptor|CodeFileDescriptor): boolean {
    if (this._state.openFiles.includes(file)) {
      return false
    }

    // Make sure to open the file adjacent of the activeFile, if possible.
    let idx = -1
    if (this._state.activeFile !== null) {
      idx = this._state.openFiles.indexOf(this._state.activeFile)
    }

    if (idx > -1) {
      this._state.openFiles.splice(idx + 1, 0, file)
    } else {
      this._state.openFiles.push(file)
    }
    this.emit('fsal-state-changed', 'openFiles')
    return true
  }

  /**
   * Closes the given file if it's in fact open. This function also makes sure
   * to re-set the current active file if the file to be closed was the active
   * one.
   *
   * @param   {MDFileDescriptor|CodeFileDescriptor}  file  The file to be closed
   *
   * @return  {boolean}                                    Whether or not the file was closed
   */
  public closeFile (file: MDFileDescriptor|CodeFileDescriptor): boolean {
    if (!this._state.openFiles.includes(file)) {
      return false
    }

    // Retrieve the index of the active file and whether it's an active file
    const activeFileIdx = this._state.openFiles.findIndex(elem => elem === this._state.activeFile)
    const isActive = this._state.activeFile === file

    // Then remove the file from the list of open files
    this._state.openFiles.splice(this._state.openFiles.indexOf(file), 1)
    this.emit('fsal-state-changed', 'openFiles')

    // Now, if we just closed the active file, we need to make another file
    // active, or none, if there are no more open files active.
    if (isActive) {
      if (this._state.openFiles.length > 0 && activeFileIdx > 0) {
        this.activeFile = this._state.openFiles[activeFileIdx - 1].path
      } else if (this._state.openFiles.length > 0 && activeFileIdx === 0) {
        this.activeFile = this._state.openFiles[0].path
      } else {
        this.activeFile = null
      }
    }
    return true
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
   * @param {string|null} descriptorPath The path of the file to set as active
   */
  public set activeFile (descriptorPath: string|null) {
    if (descriptorPath === null && this._state.activeFile !== null) {
      this._state.activeFile = null
      global.citeproc.loadMainDatabase()
      this.emit('fsal-state-changed', 'activeFile')
    } else if (descriptorPath !== null && descriptorPath !== this.activeFile) {
      let file = this.findFile(descriptorPath)

      // Check if we rather have an in-memory file
      if (descriptorPath.startsWith(':memory:')) {
        const found = this.openFiles.find(file => file.path === descriptorPath)
        if (found !== undefined) {
          file = found
        }
      }

      if (file !== null && this._state.openFiles.includes(file)) {
        // Add the file to the recent docs provider (or move it around)
        global.recentDocs.add(this.getMetadataFor(file))
        // Make sure the main database is set before, and only load an optional
        // bibliography file afterwards.
        global.citeproc.loadMainDatabase()
        // Make sure before selecting the file to load a potential file-specific
        // database. This can be defined (as for Pandoc) either directly in the
        // frontmatter OR in the metadata.
        if (file.type === 'file' && file.frontmatter !== null && 'bibliography' in file.frontmatter) {
          let dbFile: string = file.frontmatter.bibliography
          if (!path.isAbsolute(dbFile)) {
            // Convert to absolute path if necessary
            dbFile = path.resolve(file.dir, dbFile)
          }
          // We have a bibliography
          global.citeproc.loadAndSelect(dbFile)
            .finally(() => {
              // No matter what, we need to make the file active
              this._state.activeFile = file
              this.emit('fsal-state-changed', 'activeFile')
            })
            .catch(err => global.log.error(`[FSAL] Could not load file-specific database ${dbFile}`, err))
        } else {
          this._state.activeFile = file
          this.emit('fsal-state-changed', 'activeFile')
        }
      } else {
        console.error('Could not set active file. Either file was null or not in openFiles')
      }
    } // Else: No update necessary
  }

  /**
   * Returns the hash of the currently active file.
   * @returns {number|null} The hash of the active file.
   */
  public get activeFile (): string|null {
    return (this._state.activeFile !== null) ? this._state.activeFile.path : null
  }

  /**
   * Returns a file metadata object including the file contents.
   * @param {Object} file The file descriptor
   */
  public async getFileContents (file: MDFileDescriptor|CodeFileDescriptor): Promise<MDFileMeta|CodeFileMeta> {
    if (file.type === 'file') {
      let returnFile = FSALFile.metadata(file)
      returnFile.content = await FSALFile.load(file)
      return returnFile
    } else if (file.type === 'code') {
      let returnFile = FSALCodeFile.metadata(file)
      returnFile.content = await FSALCodeFile.load(file)
      return returnFile
    }

    throw new Error('[FSAL] Could not retrieve file contents: Invalid type or invalid descriptor.')
  }

  /**
   * Sets the modification flag on an open file
   */
  public markDirty (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._state.openFiles.includes(file)) {
      global.log.error('[FSAL] Cannot mark dirty a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markDirty(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markDirty(file)
    }
  }

  /**
   * Removes the modification flag on an open file
   */
  public markClean (file: MDFileDescriptor|CodeFileDescriptor): void {
    if (!this._state.openFiles.includes(file)) {
      global.log.error('[FSAL] Cannot mark clean a non-open file!', file.path)
      return
    }

    if (file.type === 'file') {
      FSALFile.markClean(file)
    } else if (file.type === 'code') {
      FSALCodeFile.markClean(file)
    }
  }

  /**
   * Updates the modification flag of all open files based on their paths's
   * presence in the path list.
   *
   * @param   {string[]}  dirtyPaths  The paths to mark dirty. All other open
   *                                  files will be marked clean.
   */
  public updateModifiedFlags (dirtyPaths: string[]): void {
    for (const openFile of this._state.openFiles) {
      if (dirtyPaths.includes(openFile.path)) {
        if (openFile.type === 'file') {
          FSALFile.markDirty(openFile)
        } else if (openFile.type === 'code') {
          FSALCodeFile.markDirty(openFile)
        }
      } else {
        if (openFile.type === 'file') {
          FSALFile.markClean(openFile)
        } else if (openFile.type === 'code') {
          FSALCodeFile.markClean(openFile)
        }
      }
    }
  }

  /**
   * Returns true if none of the open files have their modified flag set.
   */
  public isClean (): boolean {
    for (let openFile of this._state.openFiles) {
      if (openFile.modified) {
        return false
      }
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
    if (descriptor.type === 'directory') return FSALDir.metadata(descriptor)
    if (descriptor.type === 'file') return FSALFile.metadata(descriptor)
    if (descriptor.type === 'code') return FSALCodeFile.metadata(descriptor)
    if (descriptor.type === 'other') return FSALAttachment.metadata(descriptor)
    return undefined
  }

  /**
   * Attempts to find a directory in the FSAL. Returns null if not found.
   *
   * @param  {string|number}       val  Either an absolute path or a hash. NOTE: Using hashes is deprecated behaviour!
   *
   * @return {DirDescriptor|null}       Either null or the wanted directory
   */
  public findDir (val: string|number, baseTree = this._state.filetree): DirDescriptor|null {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    let found = findObject(baseTree, 'hash', val, 'children')
    if (!found || found.type !== 'directory') return null
    return found
  }

  /**
   * Attempts to find a file in the FSAL. Returns null if not found.
   *
   * @param {string|number}                             val       The value to be searched for. NOTE: Using hashes is deprecated behaviour!
   * @param {MaybeRootDescriptor[]|MaybeRootDescriptor} baseTree  The tree to search within
   *
   * @return  {MDFileDescriptor|CodeFileDescriptor|null}          Either the corresponding descriptor, or null
   */
  public findFile (
    val: string|number,
    baseTree = this._state.filetree
  ): MDFileDescriptor|CodeFileDescriptor|null {
    if (String(val).startsWith(':memory:')) {
      console.log('Searching for ' + String(val))
      // We should return an in-memory file
      const found = this.openFiles.find(file => file.path === val)
      if (found !== undefined) {
        return found
      } else {
        return null
      }
    }

    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    let found = findObject(baseTree, 'hash', val, 'children')
    if (!found || ![ 'code', 'file' ].includes(found.type)) {
      return null
    }

    return found
  }

  /**
   * Finds a non-markdown file within the filetree
   *
   * @param {string|number} val The value to be searched for. NOTE: Using hashes is deprecated behaviour!
   * @param {MaybeRootDescriptor[]|MaybeRootDescriptor} baseTree The tree to search within
   *
   * @return  {OtherFileDescriptor|null}  Either the corresponding file, or null
   */
  public findOther (
    val: string|number,
    baseTree: MaybeRootDescriptor[]|MaybeRootDescriptor = this._state.filetree
  ): OtherFileDescriptor|null {
    // We'll only search for hashes, so if the user searches for a path,
    // convert it to the hash prior to searching the tree.
    if (typeof val === 'string' && path.isAbsolute(val)) val = hash(val)
    if (typeof val !== 'number') val = parseInt(val, 10)

    // Since the attachments are not recursive, we cannot employ findObject here,
    // but have to do it "zu Fuß", as we say in Germany. NOTE: This approach is
    // ugly as hell, and might break easily. So we definitely need to come to a
    // better way of implmenting this. But in the end the larger goal here is to
    // merge the "attachments" (a.k.a. non-Markdown files) into the children-array
    // either way.
    const findInDirectory = (dir: DirDescriptor, val: number): OtherFileDescriptor|null => {
      let found = dir.attachments.find(elem => elem.hash === val)
      if (found !== undefined) {
        return found
      } else {
        const children = dir.children.filter(elem => elem.type === 'directory') as DirDescriptor[]
        for (const childDir of children) {
          let found = findInDirectory(childDir, val)
          if (found !== null) {
            return found
          }
        }
      }

      return null
    }

    if (Array.isArray(baseTree)) {
      for (const root of baseTree) {
        if (root.type !== 'directory') {
          continue
        }

        let found = findInDirectory(root, val)
        if (found !== null) {
          return found
        }
      }
    } else if (baseTree.type === 'directory') {
      let found = findInDirectory(baseTree, val)
      if (found !== null) {
        return found
      }
    }

    return null
  }

  /**
   * Finds a descriptor that is loaded.
   *
   * @param   {number|string}       val  The value. NOTE: Using hashes is deprecated behaviour!
   *
   * @return  {AnyDescriptor|null}       Returns either the descriptor, or null.
   */
  public find (val: number|string): AnyDescriptor|null {
    // First attempt to find a file ...
    let res: AnyDescriptor|null = this.findFile(val)

    // ... and if that fails, attempt to find a directory.
    if (res === null) {
      console.log('No file found for path')
      res = this.findDir(val)
    }

    // Last but not least, attempt to find a non-markdown file
    if (res === null) {
      console.log('No directory found for path')
      res = this.findOther(val)
    }

    if (res === null) console.log('No other file found for path')

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
  public hasChild (haystack: DirDescriptor, needle: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): boolean {
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

  public get statistics (): any {
    // First, we need ALL of our loaded paths as an array
    let pathsArray: Array<DirDescriptor|MDFileDescriptor|CodeFileDescriptor> = []
    for (const descriptor of this._state.filetree) {
      pathsArray = pathsArray.concat(objectToArray(descriptor, 'children'))
    }

    // Now only the files
    const mdArray = pathsArray.filter(descriptor => descriptor.type === 'file') as MDFileDescriptor[]

    // So, let's first get our min, max, mean, and median word and charcount
    let minChars = Infinity
    let maxChars = -Infinity
    let minWords = Infinity
    let maxWords = -Infinity
    let sumChars = 0
    let sumWords = 0

    for (const descriptor of mdArray) {
      if (descriptor.charCount < minChars) {
        minChars = descriptor.charCount
      }

      if (descriptor.charCount > maxChars) {
        maxChars = descriptor.charCount
      }

      if (descriptor.wordCount < minWords) {
        minWords = descriptor.wordCount
      }

      if (descriptor.wordCount > maxWords) {
        maxWords = descriptor.wordCount
      }

      sumChars += descriptor.charCount
      sumWords += descriptor.wordCount
    }

    // Now calculate the mean
    const meanChars = Math.round(sumChars / mdArray.length)
    const meanWords = Math.round(sumWords / mdArray.length)

    // Now we are interested in the standard deviation to calculate the
    // spread of words in 95 and 99 percent intervals around the mean.
    let charsSS = 0
    let wordsSS = 0

    for (const descriptor of mdArray) {
      charsSS += (descriptor.charCount - meanChars) ** 2
      wordsSS += (descriptor.wordCount - meanWords) ** 2
    }

    // Now the standard deviation
    //                        |<      Variance      >|
    const sdChars = Math.sqrt(charsSS / mdArray.length)
    const sdWords = Math.sqrt(wordsSS / mdArray.length)

    // Calculate the standard deviation interval bounds
    const chars68PercentLower = Math.round(meanChars - sdChars)
    const chars68PercentUpper = Math.round(meanChars + sdChars)
    const chars95PercentLower = Math.round(meanChars - 2 * sdChars)
    const chars95PercentUpper = Math.round(meanChars + 2 * sdChars)

    const words68PercentLower = Math.round(meanWords - sdWords)
    const words68PercentUpper = Math.round(meanWords + sdWords)
    const words95PercentLower = Math.round(meanWords - 2 * sdWords)
    const words95PercentUpper = Math.round(meanWords + 2 * sdWords)

    return {
      minChars: minChars,
      maxChars: maxChars,
      minWords: minWords,
      maxWords: maxWords,
      sumChars: sumChars,
      sumWords: sumWords,
      meanChars: meanChars,
      meanWords: meanWords,
      sdChars: Math.round(sdChars),
      sdWords: Math.round(sdWords),
      chars68PercentLower: (chars68PercentLower < minChars) ? minChars : chars68PercentLower,
      chars68PercentUpper: (chars68PercentUpper > maxChars) ? maxChars : chars68PercentUpper,
      chars95PercentLower: (chars95PercentLower < minChars) ? minChars : chars95PercentLower,
      chars95PercentUpper: (chars95PercentUpper > maxChars) ? maxChars : chars95PercentUpper,
      words68PercentLower: (words68PercentLower < minWords) ? minWords : words68PercentLower,
      words68PercentUpper: (words68PercentUpper > maxWords) ? maxWords : words68PercentUpper,
      words95PercentLower: (words95PercentLower < minWords) ? minWords : words95PercentLower,
      words95PercentUpper: (words95PercentUpper > maxWords) ? maxWords : words95PercentUpper,
      mdFileCount: pathsArray.filter(d => d.type === 'file').length,
      codeFileCount: pathsArray.filter(d => d.type === 'code').length,
      dirCount: pathsArray.filter(d => d.type === 'directory').length
    }
  }

  /**
   * Clears the cache
   */
  public clearCache (): void {
    return this._cache.clearCache()
  }

  public async sortDirectory (src: DirDescriptor, sorting?: 'time-up'|'time-down'|'name-up'|'name-down'): Promise<void> {
    this._fsalIsBusy = true
    await FSALDir.sort(src, sorting)
    this._recordFiletreeChange('change', src.path)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

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
    this._recordFiletreeChange('add', path.join(src.path, options.name))
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  /**
   * Create a new file in memory (= unsaved and with no path assigned).
   */
  public async newUnsavedFile (): Promise<MDFileDescriptor> {
    // First, find out where we should create the file -- either behind the
    // activeFile, or at the end of the list of open files.
    let activeIdx = this.openFiles.findIndex(file => file.path === this.activeFile)
    if (activeIdx < 0) {
      activeIdx = this.openFiles.length - 2
    }

    // The appendix of the filename will be a number related to the amount of
    // untitled files in the array
    const post = this.openFiles.filter(f => f.dir === ':memory:').length + 1

    // Now create the file object. It's basically treated like a root file, but
    // with no real location on the file system associated.
    const file: MDFileDescriptor = {
      parent: null,
      name: `Untitled-${post}.md`,
      dir: ':memory:', // Special location
      path: `:memory:/Untitled-${post}.md`,
      // NOTE: Many properties are strictly speaking invalid
      hash: 0,
      size: 0,
      modtime: 0, // I'm waiting for that 01.01.1970 bug to appear ( ͡° ͜ʖ ͡°)
      creationtime: 0,
      ext: '.md',
      id: '',
      type: 'file',
      tags: [],
      bom: '',
      wordCount: 0,
      charCount: 0,
      target: undefined,
      firstHeading: null,
      frontmatter: null,
      linefeed: '\n',
      modified: false
    }

    // Now splice it at the correct position
    const openFiles = this.openFiles
    openFiles.splice(activeIdx + 1, 0, file)
    this.openFiles = openFiles // Will take care of all other things

    return file
  }

  public async renameFile (src: MDFileDescriptor|CodeFileDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add
    let isOpenFile = this._state.openFiles.includes(src)
    let isActiveFile = this._state.activeFile === src

    this._watchdog.ignoreEvents([{
      'event': 'unlink',
      'path': src.path
    }])
    this._watchdog.ignoreEvents([{
      'event': 'add',
      'path': path.join(path.dirname(src.path), newName)
    }])

    if (src.type === 'file') {
      await FSALFile.rename(src, this._cache, newName)
    } else if (src.type === 'code') {
      await FSALCodeFile.rename(src, this._cache, newName)
    }

    // Now we need to re-sort the parent directory
    if (src.parent !== null) {
      await FSALDir.sort(src.parent) // Omit sorting
    }

    this._recordFiletreeChange('remove', src.path)
    this._recordFiletreeChange('add', path.join(path.dirname(src.path), newName))

    // Notify of a state change
    this.emit('fsal-state-changed', 'filetree')
    if (isActiveFile) this.emit('fsal-state-changed', 'activeFile')
    // If applicable, trigger a file synchronisation
    if (isOpenFile) this.emit('fsal-state-changed', 'openFiles')
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async removeFile (src: MDFileDescriptor|CodeFileDescriptor): Promise<void> {
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
    if (src.type === 'file') {
      await FSALFile.remove(src)
    } else {
      await FSALCodeFile.remove(src)
    }

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

    this._recordFiletreeChange('remove', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async saveFile (src: MDFileDescriptor|CodeFileDescriptor, content: string): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x change
    this._watchdog.ignoreEvents([{ 'event': 'change', 'path': src.path }])

    if (src.type === 'file') {
      await FSALFile.save(src, content, this._cache)
    } else {
      await FSALCodeFile.save(src, content, this._cache)
    }

    this._recordFiletreeChange('change', src.path)

    // Notify that a file has saved, which strictly speaking does not
    // modify the openFiles array, but does change the modification flag.
    this.emit('fsal-state-changed', 'fileSaved', { fileHash: src.hash })

    // Also, make sure to (re)load the file's bibliography file, if applicable.
    if (src.type === 'file' && src.frontmatter !== null && 'bibliography' in src.frontmatter) {
      let dbFile: string = src.frontmatter.bibliography
      if (!path.isAbsolute(dbFile)) {
        // Convert to absolute path if necessary
        dbFile = path.resolve(src.dir, dbFile)
      }
      // We have a bibliography
      global.citeproc.loadAndSelect(dbFile)
        .catch(err => global.log.error(`[FSAL] Could not load file-specific database ${dbFile}`, err))
    }

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async searchFile (src: MDFileDescriptor|CodeFileDescriptor, searchTerms: any): Promise<any> { // TODO: Implement search results type
    // NOTE: Generates no events
    // Searches a file and returns the result
    if (src.type === 'file') {
      return await FSALFile.search(src, searchTerms)
    } else {
      return await FSALCodeFile.search(src, searchTerms)
    }
  }

  public async setDirectorySetting (src: DirDescriptor, settings: any): Promise<void> {
    this._fsalIsBusy = true
    // Sets a setting on the directory
    await FSALDir.setSetting(src, settings)
    // Notify the renderer
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async createProject (src: DirDescriptor, initialProps: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.makeProject(src, initialProps)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async updateProject (src: DirDescriptor, options: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    // Updates the project properties on a directory.
    await FSALDir.updateProjectProperties(src, options)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async removeProject (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.removeProject(src)
    this.emit('fsal-state-changed', 'directory', {
      oldHash: src.hash,
      newHash: src.hash
    })

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

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
    this._recordFiletreeChange('add', absolutePath)

    // Notify the event listeners
    this.emit('fsal-state-changed', 'directory', {
      'oldHash': src.hash,
      'newHash': src.hash
    })
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async renameDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // We are probably going to need that code from the move action
    let openFilesUpdateNeeded = false
    let newActiveFilePath
    let newFilePaths: string[] = []

    // Compute the paths to be replaced
    let oldPrefix = path.join(src.dir, src.name)
    let newPrefix = path.join(src.dir, newName)

    // Check the open files if something needs to change concerning them.
    for (const file of this.openFiles) {
      let found = this.findFile(file.path, [src])
      if (found !== null) {
        // The file is in the directory, so we need to update the open files
        openFilesUpdateNeeded = true
        // Exchange the old directory path for the new one and compute
        // its new hash
        newFilePaths.push(found.path.replace(oldPrefix, newPrefix))
      } else {
        // File will not be renamed, so retain the hash
        newFilePaths.push(file.path)
      }
    }

    // We also need to make sure to re-set the active file if necessary
    if (this.activeFile !== null) {
      const maybeActiveFile = this.findFile(this.activeFile, [src])
      if (maybeActiveFile !== null) {
        newActiveFilePath = maybeActiveFile.path.replace(oldPrefix, newPrefix)
      }
    }

    // Now that we have prepared potential updates,
    // let us perform the rename.
    // NOTE: Generates 1x unlink, 1x add for each child + src!
    let adds = []
    let removes = []
    for (const child of objectToArray(src, 'children')) {
      adds.push({
        'event': child.type === 'file' ? 'add' : 'addDir',
        // Converts /old/path/oldname/file.md --> /old/path/newname/file.md
        'path': child.path.replace(oldPrefix, newPrefix)
      })
      removes.push({
        'event': child.type === 'file' ? 'unlink' : 'unlinkDir',
        'path': child.path
      })
    }

    for (const attachment of objectToArray(src, 'attachments')) {
      adds.push({
        event: 'add',
        path: attachment.path.replace(oldPrefix, newPrefix)
      })
      removes.push({
        event: 'unlink',
        path: attachment.path
      })
    }

    // Now concat the removes in reverse direction and ignore them
    this._watchdog.ignoreEvents(adds.concat(removes))
    const newDir = await FSALDir.rename(src, newName, this._cache)

    // NOTE: With regard to our filetree, it's just one unlink and one add because
    // consumers just need to remove the directory and then re-add it again.
    this._recordFiletreeChange('remove', src.path)
    this._recordFiletreeChange('add', newDir.path)

    if (src.parent === null) {
      // Exchange the directory in the filetree
      let index = this._state.filetree.indexOf(src)
      this._state.filetree.splice(index, 1, newDir)
      this._state.filetree = sort(this._state.filetree)
    }

    // Cleanup: Re-set anything within the state that has changed due to this

    // If it was the openDirectory, reinstate it
    if (this.openDirectory === src) {
      this.openDirectory = newDir
      this.emit('fsal-state-changed', 'openDirectory')
    }

    // Update open files and the active file
    if (openFilesUpdateNeeded) {
      this.openFiles = newFilePaths
        .map(filePath => this.findFile(filePath))
        .filter(file => file !== null) as Array<MDFileDescriptor|CodeFileDescriptor>

      this._consolidateOpenFiles()
    }

    if (newActiveFilePath !== undefined) {
      this.activeFile = newActiveFilePath
      this.emit('fsal-state-changed', 'activeFile')
    }

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

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
      this.unloadPath(src) // NOTE: Will automatically emit a remove history event
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

      this._recordFiletreeChange('remove', src.path)
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async move (src: AnyDescriptor, target: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add for each child, src and on the target!
    let openFilesUpdateNeeded = false
    let activeFileUpdateNeeded = false
    let newOpenDir
    let newFilePaths: Array<string|MDFileDescriptor|CodeFileDescriptor> = []
    const hasOpenDir = this.openDirectory !== null
    const srcIsDir = src.type === 'directory'
    const srcIsOpenDir = src === this.openDirectory
    const srcContainsOpenDir = srcIsDir && hasOpenDir && this.findDir((this.openDirectory as DirDescriptor).hash, [src as DirDescriptor]) !== null
    const srcContainsActiveFile = srcIsDir && this.activeFile !== null && this.findFile(this.activeFile, [src as DirDescriptor]) !== null

    // First, check if the openFiles need updates after the action
    if (srcIsDir) {
      // A directory is being moved, so check the open files if something
      // needs to change concerning them.
      for (const file of this.openFiles) {
        let found = this.findFile(file.path, [src as DirDescriptor])
        if (found !== null) {
          // The file is in there, so we need to update the open files
          openFilesUpdateNeeded = true
          // Exchange the old directory path for the new one and compute
          // its new hash
          newFilePaths.push(found.path.replace(src.dir, target.path))
        } else {
          // Nothing really to do
          newFilePaths.push(file.path)
        }
      }
    } else {
      if (this.openFiles.includes(src as MDFileDescriptor|CodeFileDescriptor)) {
        // The source is an open file, we need to account for that.
        openFilesUpdateNeeded = true
        let newPath = src.path.replace(src.dir, target.path)
        newFilePaths = this.openFiles.map(file => (file.dir === ':memory:') ? file : file.path)
        newFilePaths.splice(newFilePaths.indexOf(src.path), 1, newPath)
      }
    }

    // Then we also need to make sure to re-set the active file, if it's contained
    // somewhere here
    if (srcContainsActiveFile && this.activeFile !== null) {
      const activeFile = this.findFile(this.activeFile) as MDFileDescriptor
      this.activeFile = activeFile.path.replace(src.dir, target.path)
      activeFileUpdateNeeded = true
    }

    // Next, check if the open directory is affected
    if (srcIsOpenDir || srcContainsOpenDir) {
      // Compute the new hash and indicate an update is necessary
      newOpenDir = (this.openDirectory as DirDescriptor).path.replace(src.dir, target.path)
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

    this._recordFiletreeChange('remove', src.path)
    this._recordFiletreeChange('add', path.join(target.path, src.name))

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
    if (openFilesUpdateNeeded) {
      this.openFiles = newFilePaths
        .map(fileOrPath => {
          if (typeof fileOrPath === 'string') {
            return this.findFile(fileOrPath)
          } else {
            return fileOrPath
          }
        })
        .filter(file => file !== null) as Array<MDFileDescriptor|CodeFileDescriptor>
    }
    if (newOpenDir !== undefined) {
      this.openDirectory = this.findDir(newOpenDir)
    }
    if (activeFileUpdateNeeded) {
      this.emit('fsal-state-changed', 'activeFile')
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  } // END: move-action
}
