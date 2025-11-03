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
import { type GenericSorter, getSorter } from '@common/util/directory-sorter'
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
import { hasMarkdownExt, hasCodeExt, MD_EXT } from '@common/util/file-extention-checks'
import getMarkdownFileParser from './util/file-parser'
import type ConfigProvider from '@providers/config'
import { promises as fs, constants as FS_CONSTANTS } from 'fs'
import { safeDelete } from './util/safe-delete'
import { type FilesystemMetadata, getFilesystemMetadata } from './util/get-fs-metadata'
import ignoreDir from 'source/common/util/ignore-dir'
import broadcastIPCMessage from 'source/common/util/broadcast-ipc-message'
import { closeSplashScreen, showSplashScreen, updateSplashScreen } from './util/splash-screen'
import { trans } from 'source/common/i18n-main'
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
        return await this.readPathRecursively(payload)
      } else if (command === 'read-directory' && typeof payload === 'string') {
        return await this.readDirectory(payload)
      } else if (command === 'get-descriptor' && typeof payload === 'string') {
        return await this.getDescriptorFor(payload)
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

    await this.syncRoots()

    this._config.on('update', (which: string) => {
      if (which === 'openPaths') {
        this.syncRoots().catch(err => {
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

    // In unlink-events, there won't be a descriptor.
    if (event === 'unlink' || event === 'unlinkDir') {
      this._emitter.emit('fsal-event', { event, path: absPath })
      broadcastIPCMessage('fsal-event', { event, path: absPath })
      return
    }

    // But in any other case (change & add), we should be able to get one.
    this.getDescriptorFor(absPath)
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
    const { openPaths } = this._config.get()

    for (const rootPath of openPaths) {
      if (this.watchers.has(rootPath)) {
        continue // This path has already been loaded
      }

      try {
        const descriptor = await this.getDescriptorFor(rootPath)
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
        // TODO
      }
    }

    // Before finishing up, unwatch all roots that are no longer part of the
    // config
    for (const [ rootPath, watcher ] of this.watchers) {
      if (!openPaths.includes(rootPath)) {
        await watcher.shutdown()
        this.watchers.delete(rootPath)
      }
    }

    // Always reindex all files
    await this.reindexFiles()
  }

  /**
   * This function ensures that all files anywhere within the loaded paths are
   * properly indexed in the cache for fast access.
   */
  private async reindexFiles (): Promise<void> {
    // If the indexing isn't done after 1 second, begin displaying a splash
    // screen to indicate to the user that things are happening, even if the
    // main window(s) don't yet show.
    const timeout = setTimeout(() => {
      showSplashScreen(this._logger)
    }, 1000)
    let currentPercent = 0

    // Start a timer to measure how long the roots take to load.
    const start = performance.now()

    const { openPaths } = this._config.get()
    const pathsToIndex: string[] = []
    for (const rootPath of openPaths) {
      const allPaths = await this.readPathRecursively(rootPath)
      pathsToIndex.push(...allPaths)
      
    }

    // Now we have one large list of files to reindex. (This also allows us to
    // have a more precise splashscreen indicator)
    for (const absPath of pathsToIndex) {
      updateSplashScreen(trans('Indexing %s…', path.basename(absPath)), currentPercent)
      currentPercent += Math.round(1 / pathsToIndex.length * 100)
      // Requesting the descriptor will, behind the scenes, check for cache hits
      // and automatically recache if necessary.
      await this.getDescriptorFor(absPath)
    }

    const duration = performance.now() - start
    // Round to max. two positions after the period
    this._logger.info(`[FSAL] Re-indexed workspaces in ${Math.floor(duration / 1000 * 100) / 100} seconds`)

    clearTimeout(timeout)
    closeSplashScreen()
  }

  /**
   * Utility function that reads in and returns all descriptors for all loaded
   * paths and workspaces across the app.
   *
   * @return  {Promise<AnyDescriptor>[]}  The descriptors
   */
  public async getAllLoadedDescriptors (): Promise<AnyDescriptor[]> {
    const { openPaths } = this._config.get()
    const allDescriptors: AnyDescriptor[] = []

    for (const path of openPaths) {
      const contents = await this.readPathRecursively(path)
      for (const child of contents) {
        const descriptor = await this.getDescriptorFor(child)
        allDescriptors.push(descriptor)
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

      for (const type of MD_EXT) {
        if (descriptor.name === query + type) {
          return descriptor
        }
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
    this._cache.persist()
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
    const { idRE } = this._config.get().zkn
    return getMarkdownFileParser(idRE)
  }

  /**
   * Returns a directory sorter based on the config.
   *
   * @return  {GenericSorter}The sorter
   */
  public getDirectorySorter (): GenericSorter {
    const { sorting, sortFoldersFirst, fileNameDisplay, appLang, fileMetaTime } = this._config.get()
    return getSorter(
      sorting,
      sortFoldersFirst,
      fileNameDisplay,
      appLang,
      fileMetaTime
    )
  }

  /**
   * Returns true, if the haystack contains a descriptor with the same name as needle.
   *
   * @param   {DirDescriptor}                   haystack A dir descriptor
   * @param   {MDFileDescriptor|DirDescriptor}  needle   A file or directory descriptor
   *
   * @return  {boolean}                                  Whether needle is in haystack
   *
   * @deprecated
   */
  public hasChild (haystack: DirDescriptor, needle: MDFileDescriptor|CodeFileDescriptor|DirDescriptor): boolean {
    // DEBUG DEPRECATED
    // Hello, PHP
    // If a name checks out, return true
    for (const child of haystack.children) {
      if (child.name.toLowerCase() === needle.name.toLowerCase()) {
        return true
      }
    }

    return false
  }

  // TODO/DEBUG: MOVE TO WORKSPACES PROVIDER OR ROOT
  public async sortDirectory (src: DirDescriptor, sorting?: SortMethod): Promise<void> {
    const sorter = this.getDirectorySorter()
    await FSALDir.sort(src, sorter, sorting)
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
    if (!await this.pathExists(absPath)) {
      return false
    }

    const metadata = await getFilesystemMetadata(absPath)
    return metadata.isDirectory
  }

  /**
   * Checks if the provided absolute path is a file
   *
   * @param   {string}            absPath  The absolute path to the FS node
   *
   * @return  {Promise<boolean>}           Returns true, if absPath is a file
   */
  public async isFile (absPath: string): Promise<boolean> {
    if (!await this.pathExists(absPath)) {
      return false
    }

    const metadata = await getFilesystemMetadata(absPath)
    return metadata.isFile
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
    const deleteOnFail = this._config.get('system.deleteOnFail') as boolean
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
    if (await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    if (!await this.isFile(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath}: Not found`)
    }

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
    if (await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    if (!await this.isFile(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath}: Not found`)
    }

    const isRoot = this._config.get().openPaths.includes(absPath)

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
   *                                 recursively parse the entire tree. Ignored.
   *
   * @return  {Promise}              Promise resolves with any descriptor
   * @deprecated
   */
  public async loadAnyPath (absPath: string, _shallowDir: boolean = false): Promise<AnyDescriptor> {
    return await this.getDescriptorFor(absPath)
  }

  /**
   * Loads any given path (if it exists) into the FSAL descriptor format.
   *
   * @param   {string}   absPath     The path to load
   *
   * @return  {Promise}              Promise resolves with any descriptor
   *
   * @throws if the path does not exist
   */
  public async getDescriptorFor (absPath: string): Promise<AnyDescriptor> {
    if (await this.isDir(absPath)) {
      return await this.getAnyDirectoryDescriptor(absPath, true)
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
   *
   * @throws if the path is not a directory
   */
  public async getAnyDirectoryDescriptor (absPath: string, shallow: boolean = false): Promise<DirDescriptor> {
    if (!await this.isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load directory ${absPath}: Not a directory`)
    }

    const isRoot = this._config.get().openPaths.includes(absPath)

    return await FSALDir.parse(absPath, this._cache, this.getMarkdownFileParser(), this.getDirectorySorter(), isRoot, shallow)
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
   * @param   {string}             absPath  The absolute path to parse
   *
   * @return  {Promise<string[]>}           Returns a list of the entire directory
   */
  public async readPathRecursively (absPath: string): Promise<string[]> {
    const includedPaths: string[] = [absPath]

    if (!await this.isDir(absPath)) {
      return includedPaths
    }

    const contents = (await fs.readdir(absPath)).map(p => path.join(absPath, p))

    for (const absPath of contents) {
      const basename = path.basename(absPath)
      const includeDir = await this.isDir(absPath) && !ignoreDir(absPath)
      const isDotfile = basename.startsWith('.')
      const isFile = await this.isFile(absPath)

      if (includeDir || (isFile && !isDotfile)) {
        includedPaths.push(...await this.readPathRecursively(absPath))
      }
    }

    return includedPaths
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

    const children = await fs.readdir(absPath)

    return await Promise.all(
      children
        .map(p => path.join(absPath, p))
        .map(p => this.loadAnyPath(p))
    )
  }
}
