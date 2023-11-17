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
import FSALWatchdog, { type WatchdogEvent } from './fsal-watchdog'
import FSALCache from './fsal-cache'
import getSorter, { type GenericSorter } from './util/sort'
import type {
  AnyDescriptor,
  DirDescriptor,
  MDFileDescriptor,
  CodeFileDescriptor,
  OtherFileDescriptor,
  MaybeRootDescriptor,
  SortMethod,
  FSALStats, ProjectSettings
} from '@dts/common/fsal'
import type { SearchTerm } from '@dts/common/search'
import generateStats from './util/generate-stats'
import ProviderContract from '@providers/provider-contract'
import { app } from 'electron'
import type LogProvider from '@providers/log'
import { hasCodeExt, hasMarkdownExt, hasMdOrCodeExt } from './util/is-md-or-code-file'
import { mdFileExtensions } from './util/valid-file-extensions'
import getMarkdownFileParser from './util/file-parser'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import { getIDRE } from '@common/regular-expressions'
import type ConfigProvider from '@providers/config'
import { promises as fs } from 'fs'
import { safeDelete } from './util/safe-delete'
import type DocumentManager from '@providers/documents'
import { closeSplashScreen, showSplashScreen, updateSplashScreen } from './util/splash-screen'
import { trans } from '@common/i18n-main'
import { type FilesystemMetadata, getFilesystemMetadata } from './util/get-fs-metadata'

// Re-export all interfaces necessary for other parts of the code (Document Manager)
export {
  FSALFile,
  FSALCodeFile,
  FSALDir,
  FSALAttachment,
  type FilesystemMetadata,
  getFilesystemMetadata
}

interface FSALState {
  openDirectory: DirDescriptor|null
  filetree: MaybeRootDescriptor[]
}

export default class FSAL extends ProviderContract {
  private readonly _cache: FSALCache
  private _fsalIsBusy: boolean
  private readonly _remoteChangeBuffer: WatchdogEvent[]
  private readonly _state: FSALState
  private readonly _emitter: EventEmitter

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider,
    private readonly _docs: DocumentManager
  ) {
    super()

    const cachedir = app.getPath('userData')
    this._cache = new FSALCache(this._logger, path.join(cachedir, 'fsal/cache'))
    this._fsalIsBusy = false // Locks certain functionality during running of actions
    this._remoteChangeBuffer = [] // Holds events for later processing
    this._emitter = new EventEmitter()

    this._state = {
      // The app supports one open directory and (in theory) unlimited open files
      openDirectory: null,
      filetree: [] // Contains the full filetree
    }
  } // END constructor

  async boot (): Promise<void> {
    this._logger.verbose('FSAL booting up ...')

    // Immediately determine if the cache needs to be cleared
    const shouldClearCache = process.argv.includes('--clear-cache')
    if (this._config.newVersionDetected() || shouldClearCache) {
      this._logger.info('Clearing the FSAL cache ...')
      this.clearCache()
    }

    // If the FSAL isn't done loading after 1 second, begin displaying a splash
    // screen to indicate to the user that things are happening, even if the
    // main window(s) don't yet show.
    const timeout = setTimeout(() => {
      showSplashScreen(this._logger)
    }, 1000)

    // Start a timer to measure how long the roots take to load.
    const start = performance.now()

    // Next, load every path we should be loading from the config
    const openPaths = this._config.get().openPaths
    let currentPercent = 0
    for (const root of openPaths) {
      updateSplashScreen(trans('Loading workspace %s', path.basename(root)), currentPercent)
      currentPercent += Math.round(1 / openPaths.length * 100)

      try {
        await this.loadPath(root)
      } catch (err: any) {
        this._logger.error(`[FSAL] Removing path ${root}, as it no longer exists.`)
        this._config.removePath(root)
      }
    }

    clearTimeout(timeout)
    closeSplashScreen()

    // Round to max. two positions after the period
    const duration = Math.floor((performance.now() - start) / 1000 * 100) / 100
    this._logger.info(`[FSAL] Loaded all files and workspaces in ${duration} seconds`)

    // Afterwards we can set our pointers accordingly
    // Set the pointers either to null or last opened dir/file
    const openDir: string|null = this._config.get('openDirectory')
    if (openDir !== null && typeof openDir !== 'string') {
      this._logger.warning(`[FSAL] config::openDirectory had an unexpected value: ${String(openDir)}`)
      this._config.set('openDirectory', null)
    } else if (openDir !== null) {
      try {
        const descriptor = this.findDir(openDir)
        this.openDirectory = descriptor ?? null
      } catch (err: any) {
        this._logger.error(`[FSAL] Could not set open directory ${openDir}.`, err)
      }
    } // else: openDir was null
  }

  // Enable global event listening to updates of the config
  on (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.on(evt, callback)
  }

  once (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.once(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: string, callback: (...args: any[]) => void): void {
    this._emitter.off(evt, callback)
  }

  /**
   * Generates a watchdog that will emit events whenever a path has changed.
   * This abstracts away any watch logic from the rest of the application.
   *
   * @param   {string}        p  The path to be watched
   *
   * @return  {FSALWatchdog}     A new watchdog
   */
  public watchPath (p: string): FSALWatchdog {
    return new FSALWatchdog(p, this._logger, this._config)
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
    const roots = this._state.filetree.filter(elem => elem.type !== 'directory') as Array<MDFileDescriptor|CodeFileDescriptor>

    // Secondly, see if we can find the containing directories somewhere in our
    // filetree.
    for (const root of roots) {
      const dir = this.findDir(root.dir)

      if (dir !== undefined) {
        // The directory is, in fact loaded! So first we can pluck that file
        // from our filetree.
        this._state.filetree.splice(this._state.filetree.indexOf(root), 1)

        // Also, make sure to update the config accordingly
        this._config.removePath(root.path)
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
  }

  /**
   * Opens, reads, and parses a file to be loaded into the FSAL.
   * @param {String} filePath The file to be loaded
   */
  private async _loadFile (filePath: string): Promise<void> {
    if (hasCodeExt(filePath)) {
      const file = await FSALCodeFile.parse(filePath, this._cache, true)
      this._state.filetree.push(file)
    } else if (hasMarkdownExt(filePath)) {
      const parser = this.getMarkdownFileParser()
      const file = await FSALFile.parse(filePath, this._cache, parser, true)
      this._state.filetree.push(file)
    }
  }

  /**
   * Loads a directory tree into the FSAL recursively.
   * @param {String} dirPath The dir to be loaded
   */
  private async _loadDir (dirPath: string): Promise<void> {
    // Loads a directory
    const sorter = this.getDirectorySorter()
    const start = performance.now()

    const dir = await FSALDir.parse(
      dirPath,
      this._cache,
      this.getMarkdownFileParser(),
      sorter,
      true
    )

    const duration = performance.now() - start
    if (duration > 100) {
      // Only log if it took longer than 100ms
      this._logger.warning(`[FSAL Directory] Path ${dirPath} took ${duration}ms to load.`)
    }
    this._state.filetree.push(dir)
  }

  /**
   * Loads a non-existent directory into the FSAL using dummy data.
   * @param {String} dirPath The directory
   */
  private async _loadPlaceholder (dirPath: string): Promise<void> {
    // Load a "dead" directory
    const dir: DirDescriptor = FSALDir.getDirNotFoundDescriptor(dirPath)
    this._state.filetree.push(dir)
  }

  /**
   * Ever in need for a descriptor mocking a non existing directory? Call this
   * function.
   *
   * @param   {string}         dirPath  The directory path this descriptor
   *                                    should represent
   *
   * @return  {DirDescriptor}           The descriptor
   */
  public loadDummyDirectoryDescriptor (dirPath: string): DirDescriptor {
    return FSALDir.getDirNotFoundDescriptor(dirPath)
  }

  /**
   * Returns an instance with a new file parser. Should be used to retrieve
   * updated versions of the parser whenever the configuration changes
   *
   * @return  {Function}  A parser that can be passed to FSAL functions involving files
   */
  public getMarkdownFileParser (): (file: MDFileDescriptor, content: string) => void {
    const idPattern = this._config.get('zkn.idRE')
    return getMarkdownFileParser(idPattern)
  }

  /**
   * Returns a directory sorter based on the config.
   *
   * @return  {GenericSorter}The sorter
   */
  public getDirectorySorter (): GenericSorter {
    return getSorter(
      this._config.get('sorting'),
      this._config.get('sortFoldersFirst'),
      this._config.get('fileNameDisplay'),
      this._config.get('appLang'),
      this._config.get('sortingTime')
    )
  }

  /**
   * For "dead" directories, this function attampts to reload it. This way you
   * can also keep directories open in the file tree that are not always present
   *
   * @param   {DirDescriptor}  descriptor  The directory descriptor
   */
  public async rescanForDirectory (descriptor: DirDescriptor): Promise<void> {
    // Rescans a not found directory and, if found, replaces the directory
    // descriptor.
    if (isDir(descriptor.path)) {
      // Remove this descriptor, and have the FSAL load the real one
      this._state.filetree.splice(this._state.filetree.indexOf(descriptor), 1)
      this._logger.info(`Directory ${descriptor.name} found - Adding to file tree ...`)
      await this.loadPath(descriptor.path)
    } else {
      this._logger.info(`Rescanned directory ${descriptor.name}, but the directory still does not exist.`)
      // TODO: We need to provide user feedback --> make this function resolve to a Boolean or something.
    }
  }

  /**
   * Loads a given path into the FSAL.
   *
   * @param {String} absPath The path to be loaded
   */
  public async loadPath (absPath: string): Promise<boolean> {
    const foundPath = this.find(absPath)
    if (foundPath !== undefined) {
      // Don't attempt to load the same path twice
      return true
    }

    // Load a path
    if (isFile(absPath)) {
      this._logger.verbose(`[FSAL] Loading root file ${absPath} ...`)
      await this._loadFile(absPath)
    } else if (isDir(absPath)) {
      this._logger.verbose(`[FSAL] Loading workspace ${absPath} ...`)
      await this._loadDir(absPath)
    } else if (path.extname(absPath) === '') {
      this._logger.verbose(`[FSAL] Loading placeholder for ${absPath} ...`)
      // It's not a file (-> no extension) but it
      // could not be found -> mark it as "dead"
      await this._loadPlaceholder(absPath)
    } else {
      // If we've reached here the path poses a problem -> notify caller
      return false
    }

    const sorter = this.getDirectorySorter()

    this._state.filetree = sorter(this._state.filetree)

    this._consolidateRootFiles()

    this._logger.verbose(`[FSAL] Root ${absPath} loaded.`)

    return true
  }

  /**
   * Unloads the complete FSAL, can be used for preparation of a full reload.
   */
  public unloadAll (): void {
    this._state.filetree = []
    this._state.openDirectory = null

    this._config.set('openDirectory', null)
    broadcastIpcMessage('fsal-state-changed', 'openDirectory')
  }

  /**
   * Unloads a Root from the FSAL.
   *
   * @param  {string}  absPath The root to be removed.
   */
  public unloadPath (absPath: string): boolean {
    const root = this.find(absPath)
    if (root === undefined || root.type === 'other') {
      return false
    }

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

    return true
  }

  /**
   * Returns the directory tree, ready to be stringyfied for IPC calls.
   */
  public getTreeMeta (): MaybeRootDescriptor[] {
    return this._state.filetree
  }

  /**
   * Collects all tags loaded with any of the files in the filetree. Returns a
   * list of [ tag, files[] ].
   *
   * @return  {Array<[ string, string[] ]>}  The list of tags with the files
   */
  public collectTags (): Array<[ tag: string, files: string[] ]> {
    // NOTE: Did a small performance check, on my full directory with >1,000
    // tags and several hundred files this takes 23ms. Memory is indeed fast.
    const tags: Array<[ string, string[] ]> = []

    const allFiles = objectToArray(this._state.filetree, 'children')
      .filter(descriptor => descriptor.type === 'file') as MDFileDescriptor[]

    for (const descriptor of allFiles) {
      for (const tag of descriptor.tags) {
        const found = tags.find(elem => elem[0] === tag)
        if (found !== undefined) {
          found[1].push(descriptor.path)
        } else {
          tags.push([ tag, [descriptor.path] ])
        }
      }
    }

    return tags
  }

  /**
   * Returns all files that are loaded somewhere in the app
   *
   * @return  {Array<MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor>}  A list of all files
   */
  public getAllFiles (): Array<MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    const allFiles = objectToArray(this._state.filetree, 'children')
      .filter(descriptor => descriptor.type !== 'directory')
    return allFiles
  }

  /**
   * Attempts to find a directory in the FSAL. Returns null if not found.
   *
   * @param  {string}       val  An absolute path to search for.
   *
   * @return {DirDescriptor|undefined}       Either undefined or the wanted directory
   */
  public findDir (val: string, baseTree = this._state.filetree): DirDescriptor|undefined {
    const descriptor = locateByPath(baseTree, val)
    if (descriptor === undefined || descriptor.type !== 'directory') {
      return undefined
    }

    return descriptor
  }

  /**
   * Attempts to find a file in the FSAL. Returns null if not found.
   *
   * @param {string}                             val       An absolute path to search for.
   *
   * @return  {MDFileDescriptor|CodeFileDescriptor|undefined}  Either the corresponding descriptor, or undefined
   */
  public findFile (val: string, baseTree = this._state.filetree): MDFileDescriptor|CodeFileDescriptor|undefined {
    const descriptor = locateByPath(baseTree, val)
    if (descriptor === undefined || (descriptor.type !== 'file' && descriptor.type !== 'code')) {
      return undefined
    }

    return descriptor
  }

  /**
   * Finds a non-markdown file within the filetree
   *
   * @param {string} val An absolute path to search for.
   *
   * @return  {OtherFileDescriptor|undefined}  Either the corresponding file, or undefined
   */
  public findOther (val: string, baseTree: MaybeRootDescriptor[]|MaybeRootDescriptor = this._state.filetree): OtherFileDescriptor|undefined {
    const descriptor = locateByPath(baseTree, val)

    if (descriptor === undefined || descriptor.type !== 'other') {
      return undefined
    }

    return descriptor
  }

  /**
   * Finds a descriptor that is loaded.
   *
   * @param   {string}       absPath  The absolute path to the file or directory
   *
   * @return  {AnyDescriptor|undefined}  Returns either the descriptor, or undefined.
   */
  public find (absPath: string): AnyDescriptor|undefined {
    const descriptor = locateByPath(this._state.filetree, absPath)

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
   *
   * @param   {DirDescriptor}                   haystack A dir descriptor
   * @param   {MDFileDescriptor|DirDescriptor}  needle   A file or directory descriptor
   *
   * @return  {boolean}                                  Whether needle is in haystack
   */
  public hasChild (haystack: DirDescriptor, needle: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): boolean {
    // Hello, PHP
    // If a name checks out, return true
    for (const child of haystack.children) {
      if (child.name.toLowerCase() === needle.name.toLowerCase()) {
        return true
      }
    }

    return false
  }

  // TODO: Move the open directory management to the documents provider!
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

  // TODO: Move the open directory management to the documents provider!
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

  public async sortDirectory (src: DirDescriptor, sorting?: SortMethod): Promise<void> {
    this._fsalIsBusy = true

    const sorter = this.getDirectorySorter()
    await FSALDir.sort(src, sorter, sorting)

    this._fsalIsBusy = false
  }

  /**
   * Creates a new file in the given directory
   *
   * @param  {DirDescriptor}                                           src      The source directory
   * @param  {{ name: string, content: string, type: 'code'|'file' }}  options  Options
   */
  public async createFile (src: DirDescriptor, options: { name: string, content: string, type: 'code'|'file' }): Promise<void> {
    this._fsalIsBusy = true
    const fullPath = path.join(src.path, options.name)
    // This action needs the cache because it'll parse a file

    const isOutsideOfFSAL = this.findDir(src.path) === undefined

    if (isOutsideOfFSAL) {
      // The user wants a file outside of the FSAL
      await fs.writeFile(fullPath, '')
      await this.loadPath(fullPath)
    } else {
      // The file will be created inside the FSAL
      await FSALDir.createFile(
        src,
        options,
        this._cache,
        this.getMarkdownFileParser(),
        this.getDirectorySorter()
      )
      await this.sortDirectory(src)
    }
    this._fsalIsBusy = false
  }

  /**
   * Renames the given file
   *
   * @param  {MDFileDescriptor}  src      The file to be renamed
   * @param  {string}            newName  The new name for the file
   */
  public async renameFile (src: MDFileDescriptor|CodeFileDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true

    const parent = this.findDir(src.dir)
    const sorter = this.getDirectorySorter()
    const parser = this.getMarkdownFileParser()

    const newPath = path.join(src.dir, newName)
    const oldPath = src.path // Cache the old path

    if (parent === undefined) {
      // It's a root file
      this._config.removePath(src.path)
      this.unloadPath(src.path)
      await fs.rename(src.path, newPath)
      await this.loadPath(newPath)
      this._config.addPath(newPath)
    } else {
      await FSALDir.renameChild(parent, src.name, newName, parser, sorter, this._cache)
    }

    // Notify the documents provider so it can exchange any files if necessary
    await this._docs.hasMovedFile(oldPath, newPath)

    this._fsalIsBusy = false
  }

  /**
   * Removes the given file from the system
   *
   * @param   {MDFileDescriptor}  src   The source file
   */
  public async removeFile (src: MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor): Promise<void> {
    this._fsalIsBusy = true

    const parent = this.findDir(src.dir)
    const deleteOnFail = this._config.get('system.deleteOnFail') as boolean

    if (src.root) {
      this.unloadPath(src.path)
      await fs.unlink(src.path)
    } else if (parent !== undefined) {
      await FSALDir.removeChild(parent, src.path, deleteOnFail, this._logger)
      this._config.removePath(src.path)
    }

    this._fsalIsBusy = false
  }

  /**
   * Search the given file
   *
   * @param   {MDFileDescriptor}  src          The file to search
   * @param   {SearchTerm[]}      searchTerms  The search terms
   *
   * @return {Promise<any>}                    Returns the results
   */
  public async searchFile (src: MDFileDescriptor|CodeFileDescriptor, searchTerms: SearchTerm[]): Promise<any> { // TODO: Implement search results type
    // NOTE: Generates no events
    // Searches a file and returns the result
    if (src.type === 'file') {
      return await FSALFile.search(src, searchTerms)
    } else {
      return await FSALCodeFile.search(src, searchTerms)
    }
  }

  /**
   * Sets the given directory settings
   *
   * @param   {DirDescriptor}  src       The target directory
   */
  public async setDirectorySetting (src: DirDescriptor, settings: any): Promise<void> {
    this._fsalIsBusy = true
    // Sets a setting on the directory
    await FSALDir.setSetting(src, settings)

    this._fsalIsBusy = false
  }

  /**
   * Creates a new project in this dir
   *
   * @param   {DirDescriptor}  src           The directory
   * @param   {any}            initialProps  Any initial settings
   */
  public async createProject (src: DirDescriptor, initialProps: any): Promise<void> {
    this._fsalIsBusy = true

    await FSALDir.makeProject(src, initialProps)

    this._fsalIsBusy = false
  }

  /**
   * Updates the given properties for this project
   *
   * @param   {DirDescriptor}    src      The project dir
   * @param   {ProjectSettings}  options  New options
   */
  public async updateProject (src: DirDescriptor, options: ProjectSettings): Promise<void> {
    if (JSON.stringify(src.settings.project) === JSON.stringify(options)) {
      return
    }

    this._fsalIsBusy = true

    // Updates the project properties on a directory.
    await FSALDir.updateProjectProperties(src, options)

    this._fsalIsBusy = false
  }

  /**
   * Deletes the project in this dir
   *
   * @param   {DirDescriptor}  src  The target directory
   */
  public async removeProject (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true

    await FSALDir.removeProject(src)

    this._fsalIsBusy = false
  }

  /**
   * Creates a new directory
   *
   * @param   {DirDescriptor}  src      Where to create the dir
   * @param   {string}         newName  How to name it
   */
  public async createDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // Parses a directory and henceforth needs the cache
    // NOTE: Generates 1x add
    const absolutePath = path.join(src.path, newName)

    if (this.find(absolutePath) !== undefined) {
      // We already have such a dir or file
      throw new Error(`An object already exists at path ${absolutePath}!`)
    }

    const sorter = this.getDirectorySorter()

    await FSALDir.createDirectory(src, newName, sorter)

    this._fsalIsBusy = false
  }

  /**
   * Renames the given directory
   *
   * @param   {DirDescriptor}  src      The directory to rename
   * @param   {string}         newName  The new name for the dir
   */
  public async renameDir (src: DirDescriptor, newName: string): Promise<void> {
    this._fsalIsBusy = true
    // Compute the paths to be replaced
    const newPath = path.join(src.dir, newName)
    const oldPath = src.path

    // Now that we have prepared potential updates,
    // let us perform the rename.
    // NOTE: Generates 1x unlink, 1x add for each child + src!
    let adds = []
    let removes = []
    for (const child of objectToArray(src, 'children')) {
      adds.push({
        event: child.type === 'file' ? 'add' : 'addDir',
        // Converts /old/path/oldname/file.md --> /old/path/newname/file.md
        path: child.path.replace(src.path, newPath)
      })
      removes.push({
        event: child.type === 'file' ? 'unlink' : 'unlinkDir',
        path: child.path
      })
    }

    for (const attachment of objectToArray(src, 'attachments')) {
      adds.push({
        event: 'add',
        path: attachment.path.replace(src.path, newPath)
      })
      removes.push({ event: 'unlink', path: attachment.path })
    }

    const parent = this.findDir(src.dir)

    if (parent === undefined) {
      this.unloadPath(src.path)
      this._config.removePath(src.path)
      // chokidar always watches the parent directory, even if it's a root
      await fs.rename(src.path, newPath)
      await this.loadPath(newPath)
      this._config.addPath(newPath)
    } else {
      // Now concat the removes in reverse direction and ignore them
      await FSALDir.renameChild(
        parent,
        src.name,
        newName,
        this.getMarkdownFileParser(),
        this.getDirectorySorter(),
        this._cache
      )
    }

    // Notify the documents provider so it can exchange any files if necessary
    await this._docs.hasMovedDir(oldPath, newPath)

    // Cleanup: Re-set anything within the state that has changed due to this

    // If it was the openDirectory, reinstate it
    if (this.openDirectory === src) {
      const newDir = this.findDir(newPath)
      this.openDirectory = newDir ?? null
      this._emitter.emit('fsal-state-changed', 'openDirectory')
      if (this.openDirectory === null) {
        this._config.set('openDirectory', null)
      } else {
        this._config.set('openDirectory', this.openDirectory.path)
      }
      broadcastIpcMessage('fsal-state-changed', 'openDirectory')
    }

    this._fsalIsBusy = false
  }

  /**
   * Deletes the given directory
   *
   * @param   {DirDescriptor}  src  The dir to remove
   */
  public async removeDir (src: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true

    const parent = this.findDir(src.dir)
    const deleteOnFail: boolean = this._config.get('system.deleteOnFail')

    if (parent === undefined) {
      this.unloadPath(src.path)
      await safeDelete(src.path, deleteOnFail, this._logger)
      this._config.removePath(src.path)
    } else {
      await FSALDir.removeChild(parent, src.path, deleteOnFail, this._logger)
    }

    if (this.openDirectory === src) {
      this.openDirectory = parent ?? null
    }

    this._fsalIsBusy = false
  }

  /**
   * Moves a file or directory to its new destination
   *
   * @param   {MaybeRootDescriptor}  src     What to move
   * @param   {DirDescriptor}        target  Where to move it
   */
  public async move (src: MaybeRootDescriptor, target: DirDescriptor): Promise<void> {
    this._fsalIsBusy = true

    // NOTE: Generates 1x unlink, 1x add for each child, src and on the target!
    const newPath = path.join(target.path, src.name)
    const oldPath = src.path
    const wasOpenDir = this.openDirectory?.path === src.path

    // Now perform the actual move. What the action will do is re-read the
    // new source again, and insert it into the target, so the filetree is
    // good to go afterwards.
    const parent = this.findDir(src.dir)
    if (parent === undefined) {
      throw new Error('[FSAL] Cannot move roots!')
    }

    await FSALDir.move(
      parent,
      src,
      target,
      this.getMarkdownFileParser(),
      this.getDirectorySorter(),
      this._cache
    )

    // Notify the documents provider so it can exchange any files if necessary
    if (src.type === 'directory') {
      await this._docs.hasMovedDir(oldPath, newPath)
    } else {
      await this._docs.hasMovedFile(oldPath, newPath)
    }

    const newDescriptor = this.findDir(newPath)
    if (wasOpenDir) {
      this.openDirectory = newDescriptor ?? null
    }
    this._fsalIsBusy = false
  } // END: move-action

  /**
   * This is a convenience function to retrieve the file contents (as a string)
   * of any file that is supported by Zettlr, meaning you can use this function
   * to load the contents of any Markdown file, any JSON or YAML file, or any
   * TeX file (+ maybe others in the future).
   *
   * @throws When the path was a directory or an unsupported file (unsupported
   *         includes attachments)
   *
   * @param   {string<string>}   absPath  The path to the file
   *
   * @return  {Promise<string>}           Resolves with a string
   */
  public async loadAnySupportedFile (absPath: string): Promise<string> {
    if (isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    if (!isFile(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath}: Not found`)
    }

    if (hasMdOrCodeExt(absPath)) {
      const content = await fs.readFile(absPath, { encoding: 'utf-8' })
      return content
    }

    throw new Error(`[FSAL] Cannot load file ${absPath}: Unsupported`)
  }

  /**
   * Convenience function to retrieve a supported file (including attachments
   * in the form of a FSAL descriptor containing metadata on the file in
   * question.)
   *
   * @throws If the path points to a directory or an otherwise unsupported file.
   *
   * @param   {string}   absPath  The path to the file
   *
   * @return  {Promise<MDFileDescriptor>}           Resolves with the descriptor
   */
  public async getDescriptorForAnySupportedFile (absPath: string): Promise<MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    // DEBUG: DISABLED THIS AS IT NEEDS TO BE REMOVED DURING THE REFACTOR AT SOME POINT!
    // If we have the given file already loaded we don't have to load it again
    // const descriptor = this.find(absPath)
    // if (descriptor !== undefined && descriptor.type !== 'directory') {
    //   return descriptor
    // }

    if (isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    if (!isFile(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath}: Not found`)
    }

    const isRoot = this.findDir(path.dirname(absPath)) === undefined

    if (hasMarkdownExt(absPath)) {
      const parser = this.getMarkdownFileParser()
      const descriptor = await FSALFile.parse(absPath, this._cache, parser, isRoot)
      return descriptor
    } else if (hasCodeExt(absPath)) {
      const descriptor = await FSALCodeFile.parse(absPath, this._cache, isRoot)
      return descriptor
    } else {
      const descriptor = await FSALAttachment.parse(absPath)
      return descriptor
    }
  }

  /**
   * Loads any given path (if it exists) into the FSAL descriptor format.
   *
   * @param   {string}   absPath     The path to load
   * @param   {boolean}  shallowDir  If loading a directory, instructs to not
   *                                 recursively parse the entire tree.
   *
   * @return  {Promise}              Promise resolves with any descriptor
   */
  public async loadAnyPath (absPath: string, shallowDir: boolean = false): Promise<DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    if (isDir(absPath)) {
      return await this.getAnyDirectoryDescriptor(absPath, shallowDir)
    } else {
      return await this.getDescriptorForAnySupportedFile(absPath)
    }
  }

  /**
   * Returns any directory descriptor. NOTE: If you pass `shallow` as true, do
   * not assume that the `children`-list of the directory is always empty!
   *
   * @param   {string}                  absPath  The path to the directory
   * @param   {boolean}                 shallow  Pass true to prevent the parser
   *                                             from recursively reading in the
   *                                             entire file tree if the
   *                                             directory has not yet been
   *                                             loaded.
   *
   * @return  {Promise<DirDescriptor>}           The dir descriptor
   */
  public async getAnyDirectoryDescriptor (absPath: string, shallow: boolean = false): Promise<DirDescriptor> {
    // DEBUG: DISABLED THIS AS IT NEEDS TO BE REMOVED DURING THE REFACTOR AT SOME POINT!
    // const descriptor = this.findDir(absPath)
    // if (descriptor !== undefined) {
    //   return descriptor
    // }

    if (!isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load directory ${absPath}: Not a directory`)
    }

    return await FSALDir.parse(absPath, this._cache, this.getMarkdownFileParser(), this.getDirectorySorter(), false, shallow)
  }
}
