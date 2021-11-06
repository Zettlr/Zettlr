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
import locateByPath from './util/locate-by-path'
import * as FSALFile from './fsal-file'
import * as FSALCodeFile from './fsal-code-file'
import * as FSALDir from './fsal-directory'
import * as FSALAttachment from './fsal-attachment'
import FSALWatchdog from './fsal-watchdog'
import FSALCache from './fsal-cache'
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
import { codeFileExtensions, mdFileExtensions } from '../../../common/get-file-extensions'

// Re-export all interfaces necessary for other parts of the code (Document Manager)
export {
  FSALFile,
  FSALCodeFile,
  FSALDir,
  FSALAttachment
}

const ALLOWED_CODE_FILES = codeFileExtensions(true)
const MARKDOWN_FILES = mdFileExtensions(true)

interface FSALState {
  openDirectory: DirDescriptor|null
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
  private _history: FSALHistoryEvent[]

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
   * Calling this function will reset the filetree history so that it looks
   * clean. This might prevent breakages if there are too many changes for the
   * main window to cope.
   */
  resetFiletreeHistory (): void {
    this._history = []

    let timestamp = Date.now()

    for (const descriptor of this._state.filetree) {
      this._history.push({
        event: 'add',
        path: descriptor.path,
        timestamp: timestamp
      })

      timestamp++
    }
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

        // Also, make sure to update the config accordingly
        const rootPaths: string[] = global.config.get('openPaths')

        if (rootPaths.includes(root.path)) {
          rootPaths.splice(rootPaths.indexOf(root.path), 1)
          global.config.set('openPaths', rootPaths)
        }
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
    this._state.openDirectory = null

    this.emit('fsal-state-changed', 'openDirectory')
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

    this._state.filetree.splice(this._state.filetree.indexOf(root), 1)
    this._watchdog.unwatch(root.path)
    this._recordFiletreeChange('remove', root.path)

    return true
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
   * @param  {string}       val  An absolute path to search for.
   *
   * @return {DirDescriptor|null}       Either null or the wanted directory
   */
  public findDir (val: string, baseTree = this._state.filetree): DirDescriptor|null {
    const descriptor = locateByPath(baseTree, val)
    if (descriptor === undefined || descriptor.type !== 'directory') {
      return null
    }

    return descriptor
  }

  /**
   * Attempts to find a file in the FSAL. Returns null if not found.
   *
   * @param {string}                             val       An absolute path to search for.
   * @param {MaybeRootDescriptor[]|MaybeRootDescriptor} baseTree  The tree to search within
   *
   * @return  {MDFileDescriptor|CodeFileDescriptor|null}          Either the corresponding descriptor, or null
   */
  public findFile (val: string, baseTree = this._state.filetree): MDFileDescriptor|CodeFileDescriptor|null {
    const descriptor = locateByPath(baseTree, val)
    if (descriptor === undefined || (descriptor.type !== 'file' && descriptor.type !== 'code')) {
      return null
    }

    return descriptor
  }

  /**
   * Finds a non-markdown file within the filetree
   *
   * @param {string} val An absolute path to search for.
   * @param {MaybeRootDescriptor[]|MaybeRootDescriptor} baseTree The tree to search within
   *
   * @return  {OtherFileDescriptor|null}  Either the corresponding file, or null
   */
  public findOther (val: string, baseTree: MaybeRootDescriptor[]|MaybeRootDescriptor = this._state.filetree): OtherFileDescriptor|null {
    const descriptor = locateByPath(baseTree, val)

    if (descriptor === undefined || descriptor.type !== 'other') {
      return null
    }

    return descriptor
  }

  /**
   * Finds a descriptor that is loaded.
   *
   * @param   {number|string}       val  The value.
   *
   * @return  {AnyDescriptor|null}       Returns either the descriptor, or null.
   */
  public find (val: string): AnyDescriptor|null {
    const descriptor = locateByPath(this._state.filetree, val)

    if (descriptor === undefined) {
      return null
    } else {
      return descriptor
    }
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
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async renameFile (src: MDFileDescriptor|CodeFileDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add

    this._watchdog.ignoreEvents([{
      'event': 'unlink',
      'path': src.path
    }])
    this._watchdog.ignoreEvents([{
      'event': 'add',
      'path': path.join(src.dir, newName)
    }])

    const oldPath = src.path // Cache the old path

    if (src.type === 'file') {
      await FSALFile.rename(src, this._cache, newName)
    } else if (src.type === 'code') {
      await FSALCodeFile.rename(src, this._cache, newName)
    }

    // src.path already points to the new path
    this._recordFiletreeChange('remove', oldPath)
    this._recordFiletreeChange('add', src.path)

    // Now we need to re-sort the parent directory
    if (src.parent !== null) {
      await FSALDir.sort(src.parent) // Omit sorting
      this._recordFiletreeChange('change', src.parent.path)
    }

    // Notify of a state change
    this.emit('fsal-state-changed', 'filetree')
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

    // Now we're safe to remove the file actually.
    if (src.type === 'file') {
      await FSALFile.remove(src)
    } else {
      await FSALCodeFile.remove(src)
    }

    // In case it was a root file, we need to splice it
    if (src.parent === null) {
      this.unloadPath(src)
    }

    this._recordFiletreeChange('remove', src.path)

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

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async createProject (src: DirDescriptor, initialProps: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.makeProject(src, initialProps)

    this._recordFiletreeChange('change', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async updateProject (src: DirDescriptor, options: any): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    // Updates the project properties on a directory.
    const hasChanged = await FSALDir.updateProjectProperties(src, options)

    if (hasChanged) {
      this._recordFiletreeChange('change', src.path)
    }

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async removeProject (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates no events as dotfiles are not watched
    await FSALDir.removeProject(src)

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

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async renameDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true

    // Compute the paths to be replaced
    let oldPrefix = path.join(src.dir, src.name)
    let newPrefix = path.join(src.dir, newName)

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
      }

      this._recordFiletreeChange('remove', src.path)
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async move (src: MaybeRootDescriptor, target: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true
    // NOTE: Generates 1x unlink, 1x add for each child, src and on the target!
    let activeFileUpdateNeeded = false
    let newOpenDir
    const hasOpenDir = this.openDirectory !== null
    const srcIsDir = src.type === 'directory'
    const srcIsOpenDir = src === this.openDirectory
    const srcContainsOpenDir = srcIsDir && hasOpenDir && this.findDir((this.openDirectory as DirDescriptor).path, [src]) !== null

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
