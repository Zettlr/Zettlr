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
import * as FSALFile from './fsal-file'
import * as FSALCodeFile from './fsal-code-file'
import * as FSALDir from './fsal-directory'
import * as FSALAttachment from './fsal-attachment'
import FSALWatchdog from './fsal-watchdog'
import FSALCache from './fsal-cache'
import type {
  DirDescriptor,
  MDFileDescriptor,
  CodeFileDescriptor,
  OtherFileDescriptor,
  SortMethod,
  ProjectSettings,
  AnyDescriptor
} from '@dts/common/fsal'
import type { SearchTerm } from '@dts/common/search'
import ProviderContract from '@providers/provider-contract'
import { app, ipcMain } from 'electron'
import type LogProvider from '@providers/log'
import { hasMarkdownExt, hasCodeExt } from '@common/util/file-extention-checks'
import getMarkdownFileParser from './util/file-parser'
import type ConfigProvider from '@providers/config'
import { promises as fs, constants as FS_CONSTANTS } from 'fs'
import { safeDelete } from './util/safe-delete'
import { type FilesystemMetadata, getFilesystemMetadata } from './util/get-fs-metadata'
import { ignorePath, isDotFile } from 'source/common/util/ignore-path'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import type { EventName } from 'chokidar/handler'
import { getIDRE } from 'source/common/regular-expressions'

// Re-export all interfaces necessary for other parts of the code (Document Manager)
export {
  FSALFile,
  FSALCodeFile,
  FSALDir,
  FSALAttachment,
  type FilesystemMetadata,
  getFilesystemMetadata
}

export interface FSALEventPayloadUnlink {
  event: 'unlink'|'unlinkDir'
  path: string
}

export interface FSALEventPayloadChange {
  event: 'add'|'addDir'|'change'
  descriptor: AnyDescriptor
}

export type FSALEventPayload = FSALEventPayloadChange|FSALEventPayloadUnlink

export default class FSAL extends ProviderContract {
  private readonly _cache: FSALCache
  private readonly _emitter: EventEmitter
  private readonly watchers: Map<string, FSALWatchdog>

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()

    const cachedir = app.getPath('userData')
    this._cache = new FSALCache(this._logger, path.join(cachedir, 'fsal/cache'))
    this._emitter = new EventEmitter()
    this.watchers = new Map()

    ipcMain.handle('fsal', async (event, { command, payload }) => {
      if (command === 'read-path-recursively' && typeof payload === 'string') {
        if (await this.isFile(payload)) {
          return [payload]
        } else if (await this.isDir(payload)) {
          return await this.readDirectoryRecursively(payload)
        } else {
          return []
        }
      } else if (command === 'read-directory' && typeof payload === 'string') {
        return await this.readDirectory(payload)
      } else if (command === 'get-descriptor' && (typeof payload === 'string' || Array.isArray(payload) && payload.every(p => typeof p === 'string'))) {
        if (Array.isArray(payload)) {
          return await Promise.all(payload.map(absPath => this.getDescriptorFor(absPath)))
        } else {
          return await this.getDescriptorFor(payload)
        }
      }
    })
  } // END constructor

  async boot (): Promise<void> {
    this._logger.verbose('FSAL booting up ...')

    // Immediately determine if the cache needs to be cleared
    const shouldClearCache = process.argv.includes('--clear-cache')
    if (this._config.newVersionDetected() || shouldClearCache) {
      this._logger.info('Clearing the FSAL cache ...')
      try {
        await this._cache.clearCache()
        this._logger.info('FSAL cache cleared.')
      } catch (err: any) {
        this._logger.error(`FSAL Cache could not be cleared: ${String(err.message)}`, err)
      }
    }

    // No reindexing here. Since we're booting, and reindexing takes some time,
    // we def this to the application container which can show a splash screen.
    await this.syncRoots()

    this._config.on('update', (which: string) => {
      if (which === 'openPaths' || which === 'files.dotFiles.showInFilemanager' || which === 'files.dotFiles.showInSidebar') {
        this.syncRoots()
          .then(() => {
            // Always reindex all files after config updates later on.
            this.reindexFiles().catch(err => this._logger.error(`[FSAL] Could not reindex files: ${err.message}`, err))
          })
          .catch(err => {
            this._logger.error(`[FSAL] Could not synchronize paths: ${err.message as string}`, err)
          })
      }
    })
  }

  // Enable global event listening to updates of the config
  on (evt: 'fsal-event', callback: (event: FSALEventPayload) => void): void {
    this._emitter.on(evt, callback)
  }

  once (evt: 'fsal-event', callback: (event: FSALEventPayload) => void): void {
    this._emitter.once(evt, callback)
  }

  // Also do the same for the removal of listeners
  off (evt: 'fsal-event', callback: (event: FSALEventPayload) => void): void {
    this._emitter.off(evt, callback)
  }

  /**
   * Convenience function for emitting chokidar-related events from the watcher.
   *
   * @param   {EventName}  event    The event name
   * @param   {string}     absPath  The absolute path for this event
   */
  private emitChokidarEvent (event: EventName, absPath: string): void {
    if (event === 'all' || event === 'raw') {
      return this._logger.error('[FSAL] Cannot emit events "all" or "raw" -- wrong chokidar setup!')
    }

    if (event === 'ready') {
      return this._logger.verbose('[FSAL] Ignoring ready event.')
    }

    if (event === 'error') {
      return this._logger.error(`[FSAL] Chokidar reported an error for path "${absPath}"`)
    }

    // Regardless of the event, it will invalidate that particular cache entry.
    this._cache.del(absPath)
      .catch(err => this._logger.error(`[FSAL Cache] Failed to delete key: ${absPath}`, err))

    // In unlink-events, there won't be a descriptor.
    if (event === 'unlink' || event === 'unlinkDir') {
      this._emitter.emit('fsal-event', { event, path: absPath })
      broadcastIPCMessage('fsal-event', { event, path: absPath })
      return
    }

    // But in any other case (change & add), we should be able to get one.
    this.getDescriptorFor(absPath, false)
      .then(descriptor => {
        this._emitter.emit('fsal-event', { event, descriptor })
        broadcastIPCMessage('fsal-event', { event, descriptor })
      })
      .catch(err => {
        this._logger.error(`[FSAL] Could not emit event ${event} for path "${absPath}": ${err.message}`, err)
      })
  }

  /**
   * Synchronizes the loaded roots with the configuration's openPaths property.
   * This ensures that every path is always watched and events are properly
   * emitted.
   */
  private async syncRoots (): Promise<void> {
    const { openFiles, openWorkspaces } = this._config.get().app
    const allRoots = openFiles.concat(openWorkspaces)

    for (const rootPath of allRoots) {
      if (this.watchers.has(rootPath)) {
        continue // This path has already been loaded
      }

      try {
        const descriptor = await this.getDescriptorFor(rootPath, false)
        if (descriptor === undefined) {
          // Mount a "dummy" workspace indicating an unlinked root
          this._logger.error(`Could not load root ${rootPath}. Mounting dummy...`)
          // TODO
        } else {
          // Start watching the root path.
          const watcher = new FSALWatchdog(this._logger, this._config)
          watcher.on('change', (event, absPath) => {
            this.emitChokidarEvent(event, absPath)
          })
          watcher.watchPath(rootPath)
          this.watchers.set(rootPath, watcher)
        }
      } catch (err: any) {
        this._logger.error(`Could not load root ${rootPath}.`)
      }
    }

    // Before finishing up, unwatch all roots that are no longer part of the
    // config
    for (const [ rootPath, watcher ] of this.watchers) {
      if (!allRoots.includes(rootPath)) {
        await watcher.shutdown()
        this.watchers.delete(rootPath)
      }
    }
  }

  private ignorePath (absPath: string): boolean {
    const { files } = this._config.get()
    const showDotfiles = files.dotFiles.showInFilemanager || files.dotFiles.showInSidebar

    if (ignorePath(absPath)) {
      return true
    }

    if (isDotFile(absPath) && !showDotfiles) {
      return true
    }

    return false
  }

  /**
   * This function ensures that all files anywhere within the loaded paths are
   * properly indexed in the cache for fast access.
   */
  public async reindexFiles (onFile?: (absPath: string, percent: number) => void): Promise<void> {
    let currentPercent = 0

    // Start a timer to measure how long the roots take to load.
    let start = performance.now()

    const { openFiles, openWorkspaces } = this._config.get().app
    const pathsToIndex: string[] = []
    for (const file of openFiles) {
      if (await this.isFile(file)) {
        pathsToIndex.push(file)
      }
    }

    for (const workspace of openWorkspaces) {
      if (await this.isDir(workspace)) {
        const allPaths = await this.readDirectoryRecursively(workspace)
        pathsToIndex.push(...allPaths)
      }
    }

    const pathDiscoveryDuration = performance.now() - start
    if (pathDiscoveryDuration < 1000) {
      this._logger.info(`[FSAL] Discovered paths in ${Math.round(pathDiscoveryDuration)}ms`)
    } else {
      this._logger.info(`[FSAL] Discovered paths in ${Math.floor(pathDiscoveryDuration / 1000 * 100) / 100}s`)
    }
    start = performance.now()

    // Round the increment to 4 digits after the period.
    const roundToDigits = 4
    const factor = 10 ** roundToDigits
    const increment = Math.round(100 / pathsToIndex.length * factor) / factor

    for (const absPath of pathsToIndex) {
      currentPercent += increment
      if (onFile !== undefined) {
        onFile(absPath, currentPercent)
      }

      // Requesting the descriptor will, behind the scenes, check for cache hits
      // and automatically recache if necessary.
      await this.getDescriptorFor(absPath)
    }

    const reindexDuration = performance.now() - start
    if (reindexDuration < 1000) {
      this._logger.info(`[FSAL] Re-indexed workspaces in ${Math.round(reindexDuration)}ms`)
    } else {
      this._logger.info(`[FSAL] Re-indexed workspaces in ${Math.floor(reindexDuration / 1000 * 100) / 100}s`)
    }
  }

  /**
   * Utility function that reads in and returns all descriptors for all loaded
   * paths and workspaces across the app.
   *
   * @return  {Promise<AnyDescriptor>[]}  The descriptors
   */
  public async getAllLoadedDescriptors (): Promise<AnyDescriptor[]> {
    const { openFiles, openWorkspaces } = this._config.get().app
    const allDescriptors: AnyDescriptor[] = []

    for (const file of openFiles) {
      if (await this.isFile(file)) {
        allDescriptors.push(await this.getDescriptorFor(file))
      }
    }

    for (const workspace of openWorkspaces) {
      if (await this.isDir(workspace)) {
        const allPaths = await this.readDirectoryRecursively(workspace)
        for (const child of allPaths) {
          const descriptor = await this.getDescriptorFor(child)
          allDescriptors.push(descriptor)
        }
      }
    }

    return allDescriptors
  }

  /**
   * Searches for a file using the query, which can be either an ID (as
   * recognized by the RegExp pattern) or a filename (with or without extension)
   *
   * @param  {string}  query  What to search for
   */
  public async findExact (query: string): Promise<MDFileDescriptor|undefined> {
    const allFileDescriptors = (await this.getAllLoadedDescriptors())
      .filter(descriptor => descriptor.type === 'file')

    const { zkn } = this._config.get()
    const isQueryID = getIDRE(zkn.idRE, true).test(query)
    const hasMdExt = hasMarkdownExt(query)

    for (const descriptor of allFileDescriptors) {
      if (isQueryID && descriptor.id === query) {
        return descriptor
      }

      if (hasMdExt && descriptor.name === query) {
        return descriptor
      }

      if (descriptor.name === query + descriptor.ext) {
        return descriptor
      }
    }
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
    const watcher = this.getWatchdog()
    watcher.watchPath(p)
    return watcher
  }

  /**
   * Returns a new, empty FSAL watchdog. Add additional paths to watch by
   * calling `watchPath`. NOTE: Try to avoid instantiating empty watchers to
   * avoid conflicts while adding/removing intersecting watched paths, and use
   * `fsal.watchPath` instead!
   *
   * @return  {FSALWatchdog}  A new watchdog
   */
  public getWatchdog (): FSALWatchdog {
    return new FSALWatchdog(this._logger, this._config)
  }

  /**
   * Shuts down the service provider.
   *
   * @returns {boolean} Whether or not the shutdown was successful
   */
  public async shutdown (): Promise<void> {
    this._logger.verbose('FSAL shutting down ...')
    await this._cache.persist()
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
    return getMarkdownFileParser(this._config.get().zkn.idRE)
  }

  /**
   * Adjusts the sorting setting of the provided directory.
   *
   * @param   {DirDescriptor}     src      The directory
   * @param   {SortMethod}        sorting  The sort method.
   */
  public async changeSorting (src: DirDescriptor, sorting?: SortMethod): Promise<void> {
    await FSALDir.changeSorting(src, sorting)
  }

  /**
   * Loads a given file as a string. May throw an error if the file does not
   * exist or if it is not a text file.
   *
   * @param   {string}           filePath  The file to load
   *
   * @return  {Promise<string>}            Resolves with UTF-8 encoded content.
   */
  public async readTextFile (filePath: string): Promise<string> {
    return await fs.readFile(filePath, 'utf-8')
  }

  /**
   * Writes a given file using the provided contents. May throw an error if the
   * FSAL cannot write to the given path.
   *
   * @param  {string}  filePath  The file to write
   * @param  {string}  contents  The file contents to put in the file.
   */
  public async writeTextFile (filePath: string, contents: string): Promise<void> {
    // In case this file was cached, remove the cached data again.
    await this._cache.del(filePath)
    await fs.writeFile(filePath, contents, 'utf-8')
  }

  /**
   * Tests the access to a given path. Provide the flags as provided in
   * `fs.constants`. By default, this function checks for visibility and whether
   * we can actually read in the node.
   *
   * @return  {Promise<boolean>}  Returns true if the file fulfills the criteria.
   */
  public async testAccess (absPath: string, flags: number = FS_CONSTANTS.F_OK|FS_CONSTANTS.R_OK): Promise<boolean> {
    try {
      await fs.access(absPath, flags)
      return true
    } catch (err) {
      return false
    }
  }

  /**
   * Checks if the provided absolute path is a directory
   *
   * @param   {string}            absPath  The absolute path to the FS node
   *
   * @return  {Promise<boolean>}           Returns true, if absPath is a dir
   */
  public async isDir (absPath: string): Promise<boolean> {
    try {
      const stat = await fs.lstat(absPath)
      return stat.isDirectory()
    } catch (err: any) {
      return false
    }
  }

  /**
   * Checks if the provided absolute path is a file
   *
   * @param   {string}            absPath  The absolute path to the FS node
   *
   * @return  {Promise<boolean>}           Returns true, if absPath is a file
   */
  public async isFile (absPath: string): Promise<boolean> {
    try {
      const stat = await fs.lstat(absPath)
      return stat.isFile()
    } catch (err: any) {
      return false
    }
  }

  /**
   * Creates a new file in the given directory
   *
   * @param  {DirDescriptor}                                           src      The source directory
   * @param  {{ name: string, content: string, type: 'code'|'file' }}  options  Options
   * @deprecated  Use `writeTextFile` instead
   */
  public async createFile (filePath: string, content: string): Promise<void> {
    return await this.writeTextFile(filePath, content)
  }

  /**
   * Copies the given source file to the target location.
   *
   * @param  {string}  sourceFile  The source file
   * @param  {string}  targetFile  The target path
   */
  public async copyFile (sourceFile: string, targetFile: string): Promise<void> {
    return await fs.copyFile(sourceFile, targetFile)
  }

  /**
   * Renames the given file. DEPRECATED: Use rename instead.
   *
   * @param  {MDFileDescriptor}  src      The file to be renamed
   * @param  {string}            newName  The new name for the file
   * @deprecated
   */
  public async renameFile (oldPath: string, newPath: string): Promise<void> {
    return await this.rename(oldPath, newPath)
  }

  /**
   * Removes the given file from the system
   *
   * @param   {MDFileDescriptor}  src   The source file
   */
  public async removeFile (filePath: string): Promise<void> {
    const { deleteOnFail } = this._config.get().system
    // NOTE: This function may be called after a file or folder has been deleted. In that
    // case the function only needs to remove the file or folder from the list of children
    // to avoid safeDelete throwing an error as the file or folder does no longer exist.
    if (await this.pathExists(filePath)) {
      await safeDelete(filePath, deleteOnFail, this._logger)
    }
  }

  /**
   * Search the given file
   *
   * @param   {MDFileDescriptor}  src          The file to search
   * @param   {SearchTerm[]}      searchTerms  The search terms
   *
   * @return  {Promise<any>}                   Returns the results
   */
  public async searchFile (src: MDFileDescriptor|CodeFileDescriptor, searchTerms: SearchTerm[]): Promise<any> { // TODO: Implement search results type
    // Searches a file and returns the result
    if (src.type === 'file') {
      return await FSALFile.search(src, searchTerms)
    } else {
      return await FSALCodeFile.search(src, searchTerms)
    }
  }

  /**
   * Reads in the filenames of the provided directory. May throw an error if the
   * directory cannot be read.
   *
   * @param   {string}             dirPath  The directory to read in
   *
   * @return  {Promise<string[]>}           The files in the directory.
   */
  public async readdir (dirPath: string): Promise<string[]> {
    return await fs.readdir(dirPath, 'utf-8')
  }

  /**
   * Sets the given directory settings
   *
   * @param  {DirDescriptor}                       src       The target directory
   * @param  {Partial<DirDescriptor['settings']>}  settings  The settings to apply
   */
  public async setDirectorySetting (src: DirDescriptor, settings: Partial<DirDescriptor['settings']>): Promise<void> {
    await FSALDir.setSetting(src, settings)
  }

  /**
   * Creates a new project in this dir
   *
   * @param   {DirDescriptor}             src           The directory
   * @param   {Partial<ProjectSettings>}  initialProps  Any initial settings
   */
  public async createProject (src: DirDescriptor, initialProps: Partial<ProjectSettings>): Promise<void> {
    await FSALDir.makeProject(src, initialProps)
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
    // Updates the project properties on a directory.
    await FSALDir.updateProjectProperties(src, options)
  }

  /**
   * Deletes the project in this dir
   *
   * @param   {DirDescriptor}  src  The target directory
   */
  public async removeProject (src: DirDescriptor): Promise<void> {
    await FSALDir.removeProject(src)
  }

  /**
   * Creates a new directory
   *
   * @param   {DirDescriptor}  src      Where to create the dir
   * @param   {string}         newName  How to name it
   */
  public async createDir (dirPath: string): Promise<void> {
    await fs.mkdir(dirPath)
  }

  /**
   * Renames the given directory. DEPRECATED: Use rename instead.
   *
   * @param   {DirDescriptor}  src      The directory to rename
   * @param   {string}         newName  The new name for the dir
   * @deprecated
   */
  public async renameDir (oldPath: string, newPath: string): Promise<void> {
    return await this.rename(oldPath, newPath)
  }

  /**
   * Deletes the given directory
   *
   * @param   {DirDescriptor}  src  The dir to remove
   */
  public async removeDir (dirPath: string): Promise<void> {
    const deleteOnFail: boolean = this._config.get('system.deleteOnFail')
    if (await this.pathExists(dirPath)) {
      await safeDelete(dirPath, deleteOnFail, this._logger)
    }
  }

  /**
   * This function renames or moves a file or folder from oldPath to newPath.
   *
   * @param  {string}  oldPath  The current path of the object
   * @param  {string}  newPath  The wanted new path
   */
  public async rename (oldPath: string, newPath: string): Promise<void> {
    await fs.rename(oldPath, newPath)
  }

  /**
   * Moves a file or directory to its new destination. DEPRECATED: Use rename instead.
   *
   * @param   {MaybeRootDescriptor}  src     What to move
   * @param   {DirDescriptor}        target  Where to move it
   * @deprecated
   */
  public async move (oldPath: string, newPath: string): Promise<void> {
    return await this.rename(oldPath, newPath)
  }

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
    const descriptor = await this.getDescriptorForAnySupportedFile(absPath)

    if (descriptor.type === 'file') {
      return await FSALFile.load(descriptor)
    } else if (descriptor.type === 'code') {
      return await FSALCodeFile.load(descriptor)
    } else {
      throw new Error(`[FSAL] Cannot load file ${absPath}: Unsupported`)
    }
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
   *
   * @throws if the path is not a file
   */
  public async getDescriptorForAnySupportedFile (absPath: string): Promise<MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    if (await this.isFile(absPath)) {
      if (hasMarkdownExt(absPath)) {
        return await FSALFile.parse(absPath, this._cache, this.getMarkdownFileParser())
      } else if (hasCodeExt(absPath)) {
        return await FSALCodeFile.parse(absPath, this._cache)
      } else {
        return await FSALAttachment.parse(absPath, this._cache)
      }
    }

    if (await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    throw new Error(`[FSAL] Cannot load file ${absPath}: Not found`)

  }

  /**
   * Loads any given path (if it exists) into the FSAL descriptor format.
   *
   * @param   {string}   absPath          The path to load
   * @param   {boolean}  avoidDiskAccess  If set to true (the default), attempt
   *                                      to fetch the descriptor directly from
   *                                      the cache, without checking the file
   *                                      system modification status. This means
   *                                      that the returned descriptor may be
   *                                      outdated, but this severely speeds up
   *                                      retrieval speed as it only requires a
   *                                      single access to a `Map`.
   *
   * @return  {Promise<AnyDescriptor>}    Promise resolves with any descriptor
   *
   * @throws if the path does not exist
   */
  public async getDescriptorFor (absPath: string, avoidDiskAccess: boolean = true): Promise<AnyDescriptor> {
    if (avoidDiskAccess) {
      const cacheHit = await this._cache.get(absPath)
      if (cacheHit !== undefined) {
        return cacheHit
      }
    }

    try {
      return await this.getAnyDirectoryDescriptor(absPath)
    } catch (err: any) {
      return await this.getDescriptorForAnySupportedFile(absPath)
    }
  }

  /**
   * Returns any directory descriptor. NOTE: If you pass `shallow` as true, do
   * not assume that the `children`-list of the directory is always empty!
   *
   * @param   {string}                  absPath  The path to the directory
   *
   * @return  {Promise<DirDescriptor>}           The dir descriptor
   *
   * @throws if the path is not a directory
   */
  public async getAnyDirectoryDescriptor (absPath: string): Promise<DirDescriptor> {
    if (!await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load directory ${absPath}: Not a directory`)
    }

    return await FSALDir.parse(absPath)
  }

  /**
   * Checks if a given path exists on the file system. Optional flags can be
   * passed to check specific access rights. By default, will check for general
   * access (i.e., the process can see the file), and read access, but not write
   * access. Use fs.constants as flags.
   *
   * @param   {string}            absPath  The path to check
   * @param   {number|undefined}  flags    Optional mode check flags
   *
   * @return  {Promise<boolean>}           Resolves to true or false
   */
  public async pathExists (absPath: string, flags: number = FS_CONSTANTS.F_OK|FS_CONSTANTS.R_OK): Promise<boolean> {
    try {
      await fs.access(absPath, flags)
      return true
    } catch (err: any) {
      return false
    }
  }

  /**
   * Returns an object with fundamental file system metadata for the provided
   * absPath. May throw on error.
   *
   * @param   {string}                       absPath  The path to access.
   *
   * @return  {Promise<FilesystemMetadata>}           Returns the metadata.
   * @throws
   */
  public async getFilesystemMetadata (absPath: string): Promise<FilesystemMetadata> {
    return await getFilesystemMetadata(absPath)
  }

  // *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** *** ***

  /**
   * Reads `absPath` into an array of absolute paths. If `absPath` is a file,
   * the array will only contain that, allowing you to skip any check for
   * whether a root path is a file or folder. If it is a directory, it will read
   * in the directory and any children recursively to construct a list of every
   * file and folder within `absPath` and return it.
   *
   * NOTE: This function will already exclude dotfiles and ignored directories,
   * so this function is safe to consume in terms of what Zettlr should display.
   *
   * @param   {string}             directoryPath  The absolute path to parse
   *
   * @return  {Promise<string[]>}           Returns a list of the entire directory
   */
  public async readDirectoryRecursively (directoryPath: string): Promise<string[]> {
    if (!await this.isDir(directoryPath)) {
      throw new Error(`[FSAL] Cannot read path ${directoryPath}: Not a directory!`)
    }

    const contents = (await fs.readdir(directoryPath, { withFileTypes: true }))
      .filter(dirent => {
        return ((dirent.isFile() || dirent.isDirectory()) && !this.ignorePath(dirent.name))
      })
      .map(dirent => {
        const childPath = path.join(directoryPath, dirent.name)

        if (dirent.isFile()) {
          return Promise.resolve([childPath])
        } else if (dirent.isDirectory()) {
          return this.readDirectoryRecursively(childPath)
        } else {
          return Promise.resolve([])
        }
      })

    return [ directoryPath, ...(await Promise.all(contents)).flat() ]
  }

  /**
   * Reads a single directory from disk and returns a list of its children as
   * descriptors.
   *
   * @param   {string}                    absPath  The directory path.
   *
   * @return  {Promise<AnyDescriptor>[]}           The children.
   */
  public async readDirectory (absPath: string): Promise<AnyDescriptor[]> {
    if (!await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot read path ${absPath}: Not a directory!`)
    }

    const children = await fs.readdir(absPath, { withFileTypes: true })
    return await Promise.all(
      children
        .filter(dirent => {
          return ((dirent.isFile() || dirent.isDirectory()) && !this.ignorePath(dirent.name))
        })
        .map(dirent => {
          const childPath = path.join(absPath, dirent.name)
          return this.getDescriptorFor(childPath)
        })
    )
  }
}
