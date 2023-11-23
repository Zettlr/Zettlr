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
import isFile from '@common/util/is-file'
import isDir from '@common/util/is-dir'
import objectToArray from '@common/util/object-to-array'
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
import getMarkdownFileParser from './util/file-parser'
import type ConfigProvider from '@providers/config'
import { promises as fs, constants as FS_CONSTANTS } from 'fs'
import { safeDelete } from './util/safe-delete'
import type DocumentManager from '@providers/documents'
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
   * Returns the directory tree, ready to be stringyfied for IPC calls.
   */
  public getTreeMeta (): MaybeRootDescriptor[] {
    // DEBUG DEPRECATED
    return this._state.filetree
  }

  /**
   * Collects all tags loaded with any of the files in the filetree. Returns a
   * list of [ tag, files[] ].
   *
   * @return  {Array<[ string, string[] ]>}  The list of tags with the files
   */
  public collectTags (): Array<[ tag: string, files: string[] ]> {
    // DEBUG DEPRECATED; MOVE TO ROOTS/WORKSPACE PROVIDER
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
    // DEBUG DEPRECATED
    const allFiles = objectToArray(this._state.filetree, 'children')
      .filter(descriptor => descriptor.type !== 'directory')
    return allFiles
  }

  /**
   * Finds a non-markdown file within the filetree
   *
   * @param {string} val An absolute path to search for.
   *
   * @return  {OtherFileDescriptor|undefined}  Either the corresponding file, or undefined
   */
  public findOther (val: string, baseTree: MaybeRootDescriptor[]|MaybeRootDescriptor = this._state.filetree): OtherFileDescriptor|undefined {
    // DEBUG DEPRECATED
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
    // DEBUG DEPRECATED
    const descriptor = locateByPath(this._state.filetree, absPath)

    if (descriptor === undefined) {
      return undefined
    } else {
      return descriptor
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

  // DEBUG: MOVE TO WORKSPACES PROVIDER
  public get statistics (): FSALStats {
    return generateStats(this._state.filetree)
  }

  /**
   * Clears the cache
   */
  public clearCache (): void {
    return this._cache.clearCache()
  }

  // TODO/DEBUG: MOVE TO WORKSPACES PROVIDER OR ROOT
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
  public async createFile (filePath: string, content: string): Promise<void> {
    this._fsalIsBusy = true
    // TODO: Implement loading mechanism in the corresponding command!
    await fs.writeFile(filePath, content)
    this._fsalIsBusy = false
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
    this._fsalIsBusy = true
    const deleteOnFail = this._config.get('system.deleteOnFail') as boolean
    // NOTE: This function may be called after a file or folder has been deleted. In that
    // case the function only needs to remove the file or folder from the list of children
    // to avoid safeDelete throwing an error as the file or folder does no longer exist.
    if (await this.pathExists(filePath)) {
      await safeDelete(filePath, deleteOnFail, this._logger)
    }
    this._fsalIsBusy = false
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
  public async createDir (dirPath: string): Promise<void> {
    this._fsalIsBusy = true
    await fs.mkdir(dirPath)
    this._fsalIsBusy = false
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
    this._fsalIsBusy = true
    const deleteOnFail: boolean = this._config.get('system.deleteOnFail')
    if (await this.pathExists(dirPath)) {
      await safeDelete(dirPath, deleteOnFail, this._logger)
    }
    this._fsalIsBusy = false
  }

  /**
   * This function renames or moves a file or folder from oldPath to newPath.
   *
   * @param  {string}  oldPath  The current path of the object
   * @param  {string}  newPath  The wanted new path
   */
  public async rename (oldPath: string, newPath: string): Promise<void> {
    this._fsalIsBusy = true
    await fs.rename(oldPath, newPath)
    // Notify the documents provider so it can exchange any files if necessary
    if (isFile(newPath)) {
      await this._docs.hasMovedFile(oldPath, newPath)
    } else {
      await this._docs.hasMovedDir(oldPath, newPath)
    }
    this._fsalIsBusy = false
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
    if (isDir(absPath)) {
      throw new Error(`[FSAL] Cannot load file ${absPath} as it is a directory`)
    }

    if (!isFile(absPath)) {
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
    if (!isDir(absPath)) {
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
}
