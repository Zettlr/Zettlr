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
import { performance } from 'perf_hooks'
import isFile from '@common/util/is-file'
import isDir from '@common/util/is-dir'
import objectToArray from '@common/util/object-to-array'
import findObject from '@common/util/find-object'
import locateByPath from './util/locate-by-path'
import * as FSALFile from './fsal-file'
import * as FSALCodeFile from './fsal-code-file'
import * as FSALDir from './fsal-directory'
import * as FSALAttachment from './fsal-attachment'
import FSALWatchdog from './fsal-watchdog'
import FSALCache from './fsal-cache'
import getSorter from './util/sort'
import {
  WatchdogEvent,
  AnyDescriptor,
  DirDescriptor,
  MDFileDescriptor,
  CodeFileDescriptor,
  OtherFileDescriptor,
  MaybeRootDescriptor
} from '@dts/main/fsal'
import { MDFileMeta, CodeFileMeta, AnyMetaDescriptor, MaybeRootMeta, FSALStats } from '@dts/common/fsal'
import { SearchTerm } from '@dts/common/search'
import generateStats from './util/generate-stats'
import ProviderContract from '@providers/provider-contract'
import { app } from 'electron'
import TargetProvider from '@providers/targets'
import LogProvider from '@providers/log'
import TagProvider from '@providers/tags'
import { hasCodeExt, hasMarkdownExt, isMdOrCodeFile } from './util/is-md-or-code-file'
import { mdFileExtensions } from './util/valid-file-extensions'
import getMarkdownFileParser from './util/file-parser'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { getIDRE } from '@common/regular-expressions'

// Re-export all interfaces necessary for other parts of the code (Document Manager)
export {
  FSALFile,
  FSALCodeFile,
  FSALDir,
  FSALAttachment
}

interface FSALState {
  openDirectory: DirDescriptor|null
  filetree: MaybeRootDescriptor[]
}

/**
 * Declares an event that happens on the FSAL
 */
export interface FSALHistoryEvent {
  event: 'add'|'change'|'remove'
  path: string
  timestamp: number
}

export default class FSAL extends ProviderContract {
  private readonly _cache: FSALCache
  private readonly _watchdog: FSALWatchdog
  private _isCurrentlyHandlingRemoteChange: boolean
  private _fsalIsBusy: boolean
  private readonly _remoteChangeBuffer: WatchdogEvent[]
  private _state: FSALState
  private _history: FSALHistoryEvent[]
  private readonly _emitter: EventEmitter

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _targets: TargetProvider,
    private readonly _tags: TagProvider
  ) {
    super()

    const cachedir = app.getPath('userData')
    this._cache = new FSALCache(this._logger, path.join(cachedir, 'fsal/cache'))
    this._watchdog = new FSALWatchdog(this._logger, this._config)
    this._isCurrentlyHandlingRemoteChange = false
    this._fsalIsBusy = false // Locks certain functionality during running of actions
    this._remoteChangeBuffer = [] // Holds events for later processing
    this._history = []
    this._emitter = new EventEmitter()

    this._state = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      filetree: [] // Contains the full filetree
    }

    // Finally, set up listeners for global targets
    this._targets.on('update', (filePath: string) => {
      let file = this.findFile(filePath)
      if (file === null || file.type !== 'file') return // Not our business
      // Simply pull in the new target
      FSALFile.setTarget(file, this._targets.get(filePath))
      this._recordFiletreeChange('change', file.path)
    })

    this._targets.on('remove', (filePath: string) => {
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

  async boot (): Promise<void> {
    this._logger.verbose('FSAL booting up ...')

    // Immediately determine if the cache needs to be cleared
    const shouldClearCache = process.argv.includes('--clear-cache')
    if (this._config.newVersionDetected() || shouldClearCache) {
      this._logger.info('Clearing the FSAL cache ...')
      this.clearCache()
    }

    // Start a timer to measure how long the roots take to load.
    const start = performance.now()

    // Next, load every path we should be loading from the config
    for (const rootOrWorkspace of this._config.get('openPaths') as string[]) {
      try {
        await this.loadPath(rootOrWorkspace)
      } catch (err: any) {
        this._logger.error(`[FSAL] Removing path ${rootOrWorkspace}, as it no longer exists.`)
        this._config.removePath(rootOrWorkspace)
      }
    }

    const duration = (performance.now() - start) / 1000
    this._logger.info(`[FSAL] Loaded all files and workspaces in ${duration} seconds`)

    // Afterwards we can set our pointers accordingly
    // Set the pointers either to null or last opened dir/file
    const openDir: string|null = this._config.get('openDirectory')
    if (openDir !== null) {
      try {
        const descriptor = this.findDir(openDir)
        this.openDirectory = descriptor
      } catch (err: any) {
        this._logger.error(`[FSAL] Could not set open directory ${openDir}.`, err)
      }
    } // else: openDir was null

    // Verify the integrity of the targets after we can be sure all files have
    // been loaded
    this._targets.verify(this)
  }

  // Enable global event listening to updates of the config
  on (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.on(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.off(evt, callback)
  }

  /**
   * Adds an event to the filetree history and emits an event to notify consumers.
   *
   * @param   {add|remove|change}  event        The event type
   * @param   {string}             changedPath  The affected path
   */
  private _recordFiletreeChange (event: 'add'|'remove'|'change', changedPath: string): void {
    // The timestamp is just an ascending number (since we don't care about the
    // precise timings, the only importance is the order in which they occur.)
    let timestamp = 1
    if (this._history.length > 0) {
      const lastEvent = this._history[this._history.length - 1]
      timestamp = lastEvent.timestamp + 1
    }

    this._history.push({
      event: event,
      path: changedPath,
      timestamp: timestamp
    })

    this._emitter.emit('fsal-state-changed', 'filetree', changedPath)
    broadcastIpcMessage('fsal-state-changed', 'filetree')
  }

  /**
   * Calling this function will reset the filetree history so that it looks
   * clean. This might prevent breakages if there are too many changes for the
   * main window to cope.
   */
  resetFiletreeHistory (): void {
    this._history = []
    // Notify callees to also reset their history timestamp pointers
    this._emitter.emit('fsal-state-changed', 'reset-history')
    broadcastIpcMessage('fsal-state-changed', 'reset-history')

    let timestamp = 1

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
      if (descriptor === undefined) {
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
      if (isMdOrCodeFile(changedPath) || isDir(changedPath)) {
        const sorter = getSorter(
          this._config.get('sorting'),
          this._config.get('sortFoldersFirst'),
          this._config.get('fileNameDisplay'),
          this._config.get('appLang'),
          this._config.get('sortingTime')
        )

        await FSALDir.addChild(
          parentDescriptor,
          changedPath,
          this._tags,
          this._targets,
          this.getMarkdownFileParser(),
          sorter,
          this._cache
        )
      } else {
        await FSALDir.addAttachment(parentDescriptor, changedPath)
      }
      // Finally, add a history event of what has happened
      this._recordFiletreeChange('add', changedPath)
    } else if (['change'].includes(event)) {
      // A file has been modified. Can be an attachment, a MD file, or a code file
      const affectedDescriptor = this.find(changedPath) as AnyDescriptor
      if (affectedDescriptor.type === 'code') {
        await FSALCodeFile.reparseChangedFile(affectedDescriptor, this._cache)
      } else if (affectedDescriptor.type === 'file') {
        await FSALFile.reparseChangedFile(
          affectedDescriptor,
          this.getMarkdownFileParser(),
          this._tags,
          this._cache
        )
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
        this._logger.info(`Could not process event ${event.event} for ${event.path}: The corresponding node does not exist anymore.`)
        return this._afterRemoteChange() // Try the next event
      }
      this._onRemoteChange(event.event, event.path).catch(e => this._logger.error(e.message, e))
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
        const rootPaths: string[] = this._config.get('openPaths')

        if (rootPaths.includes(root.path)) {
          rootPaths.splice(rootPaths.indexOf(root.path), 1)
          this._config.set('openPaths', rootPaths)
        }
      }
    }
  }

  /**
   * Shuts down the service provider.
   *
   * @returns {boolean} Whether or not the shutdown was successful
   */
  public async shutdown (): Promise<void> {
    this._logger.verbose('FSAL shutting down ...')
    this._cache.persist()
    await this._watchdog.shutdown()
  }

  /**
   * Opens, reads, and parses a file to be loaded into the FSAL.
   * @param {String} filePath The file to be loaded
   */
  private async _loadFile (filePath: string): Promise<void> {
    const parser = this.getMarkdownFileParser()
    if (hasCodeExt(filePath)) {
      let file = await FSALCodeFile.parse(filePath, this._cache)
      this._state.filetree.push(file)
      this._recordFiletreeChange('add', filePath)
    } else if (hasMarkdownExt(filePath)) {
      let file = await FSALFile.parse(filePath, this._cache, parser, this._targets, this._tags)
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
    const start = performance.now()
    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    const dir = await FSALDir.parse(
      dirPath,
      this._cache,
      this._tags,
      this._targets,
      this.getMarkdownFileParser(),
      sorter,
      null
    )
    const duration = performance.now() - start
    if (duration > 100) {
      // Only log if it took longer than 100ms
      this._logger.warning(`[FSAL Directory] Path ${dirPath} took ${duration}ms to load.`)
    }
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

  /**
   * Returns an instance with a new file parser. Should be used to retrieve updated
   * versions of the parser whenever the configuration changes
   *
   * @return  {Function}  A parser that can be passed to FSAL functions involving files
   */
  public getMarkdownFileParser (): (file: MDFileDescriptor, content: string) => void {
    const linkStart = this._config.get('zkn.linkStart')
    const linkEnd = this._config.get('zkn.linkEnd')
    const idPattern = this._config.get('zkn.idRE')
    return getMarkdownFileParser(linkStart, linkEnd, idPattern)
  }

  public async rescanForDirectory (descriptor: DirDescriptor): Promise<void> {
    // Rescans a not found directory and, if found, replaces the directory
    // descriptor.
    if (isDir(descriptor.path)) {
      // Remove this descriptor, and have the FSAL load the real one
      const idx = this._state.filetree.indexOf(descriptor)
      this._state.filetree.splice(idx, 1)
      this._recordFiletreeChange('remove', descriptor.path)
      this._logger.info(`Directory ${descriptor.name} found - Adding to file tree ...`)
      await this.loadPath(descriptor.path)
    } else {
      this._logger.info(`Rescanned directory ${descriptor.name}, but the directory still does not exist.`)
      // TODO: We need to provide user feedback --> make this function resolve to a Boolean or something.
    }
  }

  /**
   * Loads a given path into the FSAL.
   * @param {String} p The path to be loaded
   */
  public async loadPath (p: string): Promise<boolean> {
    const foundPath = this.find(p)
    if (foundPath !== undefined) {
      // Don't attempt to load the same path twice
      return true
    }

    // Load a path
    const start = Date.now()
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
      this._logger.warning(`[FSAL] Path ${p} took ${Date.now() - start}ms to load.`)
    }

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    this._state.filetree = sorter(this._state.filetree)

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

    this._emitter.emit('fsal-state-changed', 'openDirectory')
    if (this.openDirectory === null) {
      this._config.set('openDirectory', null)
    } else {
      this._config.set('openDirectory', this.openDirectory.path)
    }
    broadcastIpcMessage('fsal-state-changed', 'openDirectory')
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
    let ret: MaybeRootMeta[] = []
    for (let root of this._state.filetree) {
      ret.push(this.getMetadataFor(root) as MaybeRootMeta)
    }

    // We know there are no undefines in here, so give to correct type
    return ret
  }

  /**
   * Returns a metadata object for the given descriptor
   *
   * @param   {AnyDescriptor}  descriptor  The descriptor to return metadata for
   *
   * @return  {AnyMetaDescriptor}          The metadata for that descriptor
   */
  public getMetadataFor (descriptor: AnyDescriptor): AnyMetaDescriptor {
    if (descriptor.type === 'directory') {
      return FSALDir.metadata(descriptor)
    } else if (descriptor.type === 'file') {
      return FSALFile.metadata(descriptor)
    } else if (descriptor.type === 'code') {
      return FSALCodeFile.metadata(descriptor)
    } else {
      return FSALAttachment.metadata(descriptor)
    }
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
   * @return  {AnyDescriptor|undefined}  Returns either the descriptor, or undefined.
   */
  public find (val: string): AnyDescriptor|undefined {
    const descriptor = locateByPath(this._state.filetree, val)

    if (descriptor === undefined) {
      return undefined
    } else {
      return descriptor
    }
  }

  /**
   * Searches for a file using the query, which can be either an ID (as
   * recognized by the RegExp pattern) or a filename (with or without extension)
   *
   * @param  {string}  query  What to search for
   */
  public findExact (query: string): MDFileDescriptor|undefined {
    const idREPattern = this._config.get('zkn.idRE')

    const idRE = getIDRE(idREPattern, true)
    const extensions = mdFileExtensions(true)

    // First, let's see if what we got looks like an ID, or not. If it looks
    // like an ID, attempt to match it that way, else try to search for a
    // filename.
    if (idRE.test(query)) {
      // It's an ID
      return findObject(this._state.filetree, 'id', query, 'children')
    } else {
      if (hasMarkdownExt(query)) {
        return findObject(this._state.filetree, 'name', query, 'children')
      } else {
        // No file ending given, so let's test all allowed. The filetypes are
        // sorted by probability (first .md, then .markdown), to reduce the
        // amount of time spent on the tree.
        for (const type of extensions) {
          const file = findObject(this._state.filetree, 'name', query + type, 'children')
          if (file !== undefined) {
            return file
          }
        }
      }
    }
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
    this._emitter.emit('fsal-state-changed', 'openDirectory')
    if (this.openDirectory === null) {
      this._config.set('openDirectory', null)
    } else {
      this._config.set('openDirectory', this.openDirectory.path)
    }
    broadcastIpcMessage('fsal-state-changed', 'openDirectory')
  }

  public get openDirectory (): DirDescriptor|null {
    return this._state.openDirectory
  }

  public get statistics (): FSALStats {
    return generateStats(this._state.filetree)
  }

  /**
   * Clears the cache
   */
  public clearCache (): void {
    return this._cache.clearCache()
  }

  public async sortDirectory (src: DirDescriptor, sorting?: 'time-up'|'time-down'|'name-up'|'name-down'): Promise<void> {
    this._fsalIsBusy = true
    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    await FSALDir.sort(src, sorter, sorting)
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

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    await FSALDir.createFile(
      src,
      options,
      this._cache,
      this._targets,
      this._tags,
      this.getMarkdownFileParser(),
      sorter
    )
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
      await FSALFile.rename(
        src,
        newName,
        this.getMarkdownFileParser(),
        this._tags,
        this._cache
      )
    } else if (src.type === 'code') {
      await FSALCodeFile.rename(src, this._cache, newName)
    }

    // src.path already points to the new path
    this._recordFiletreeChange('remove', oldPath)
    this._recordFiletreeChange('add', src.path)

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    // Now we need to re-sort the parent directory
    if (src.parent !== null) {
      await FSALDir.sort(src.parent, sorter) // Omit sorting
      this._recordFiletreeChange('change', src.parent.path)
    }

    // Notify of a state change
    this._emitter.emit('fsal-state-changed', 'filetree')
    broadcastIpcMessage('fsal-state-changed', 'filetree')
    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async removeFile (src: MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor): Promise<void> {
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
      await FSALFile.remove(src, this._config.get('system.deleteOnFail'))
    } else if (src.type === 'code') {
      await FSALCodeFile.remove(src, this._config.get('system.deleteOnFail'))
    } else {
      await FSALAttachment.remove(src, this._config.get('system.deleteOnFail'))
    }

    // In case it was a root file, we need to splice it
    if (src.parent === null && src.type !== 'other') {
      this.unloadPath(src)
    }

    this._recordFiletreeChange('remove', src.path)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async searchFile (src: MDFileDescriptor|CodeFileDescriptor, searchTerms: SearchTerm[]): Promise<any> { // TODO: Implement search results type
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

    if (this.find(absolutePath) !== undefined) {
      // We already have such a dir or file
      throw new Error(`An object already exists at path ${absolutePath}!`)
    }

    this._watchdog.ignoreEvents([{
      'event': 'addDir',
      'path': absolutePath
    }])

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    await FSALDir.create(
      src,
      newName,
      this._cache,
      this._tags,
      this._targets,
      this.getMarkdownFileParser(),
      sorter
    )
    this._recordFiletreeChange('add', absolutePath)

    this._fsalIsBusy = false
    this._afterRemoteChange()
  }

  public async renameDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // Compute the paths to be replaced
    const oldPrefix = path.join(src.dir, src.name)
    const newPrefix = path.join(src.dir, newName)

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

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    // Now concat the removes in reverse direction and ignore them
    this._watchdog.ignoreEvents(adds.concat(removes))
    const newDir = await FSALDir.rename(
      src,
      newName,
      this._tags,
      this._targets,
      this.getMarkdownFileParser(),
      sorter,
      this._cache
    )

    // NOTE: With regard to our filetree, it's just one unlink and one add because
    // consumers just need to remove the directory and then re-add it again.
    this._recordFiletreeChange('remove', src.path)
    this._recordFiletreeChange('add', newDir.path)

    if (src.parent === null) {
      // Exchange the directory in the filetree
      let index = this._state.filetree.indexOf(src)
      this._state.filetree.splice(index, 1, newDir)
      this._state.filetree = sorter(this._state.filetree)
    }

    // Cleanup: Re-set anything within the state that has changed due to this

    // If it was the openDirectory, reinstate it
    if (this.openDirectory === src) {
      this.openDirectory = newDir
      this._emitter.emit('fsal-state-changed', 'openDirectory')
      if (this.openDirectory === null) {
        this._config.set('openDirectory', null)
      } else {
        this._config.set('openDirectory', this.openDirectory.path)
      }
      broadcastIpcMessage('fsal-state-changed', 'openDirectory')
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

    await FSALDir.remove(src, this._config.get('system.deleteOnFail'))

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

    const sorter = getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )

    // Now perform the actual move. What the action will do is re-read the
    // new source again, and insert it into the target, so the filetree is
    // good to go afterwards.
    await FSALDir.move(
      src,
      target,
      this._tags,
      this._targets,
      this.getMarkdownFileParser(),
      sorter,
      this._cache
    )

    this._recordFiletreeChange('remove', src.path)
    this._recordFiletreeChange('add', path.join(target.path, src.name))

    if (newOpenDir !== undefined) {
      this.openDirectory = this.findDir(newOpenDir)
    }
    if (activeFileUpdateNeeded) {
      this._emitter.emit('fsal-state-changed', 'activeFile')
    }
    this._fsalIsBusy = false
    this._afterRemoteChange()
  } // END: move-action
}
