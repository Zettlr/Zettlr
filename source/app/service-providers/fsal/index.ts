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
import { type GenericSorter, getSorter } from './util/directory-sorter'
import type {
  DirDescriptor,
  MDFileDescriptor,
  CodeFileDescriptor,
  OtherFileDescriptor,
  SortMethod,
  ProjectSettings
} from '@dts/common/fsal'
import type { SearchTerm } from '@dts/common/search'
import ProviderContract from '@providers/provider-contract'
import { app } from 'electron'
import type LogProvider from '@providers/log'
import { hasCodeExt, hasMarkdownExt, hasMdOrCodeExt } from './util/is-md-or-code-file'
import getMarkdownFileParser from './util/file-parser'
import type ConfigProvider from '@providers/config'
import { promises as fs, constants as FS_CONSTANTS } from 'fs'
import { safeDelete } from './util/safe-delete'
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

export default class FSAL extends ProviderContract {
  private readonly _cache: FSALCache
  private readonly _emitter: EventEmitter

  constructor (
    private readonly _logger: LogProvider,
    private readonly _config: ConfigProvider
  ) {
    super()

    const cachedir = app.getPath('userData')
    this._cache = new FSALCache(this._logger, path.join(cachedir, 'fsal/cache'))
    this._emitter = new EventEmitter()
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

  /**
   * Clears the cache
   */
  public clearCache (): void {
    return this._cache.clearCache()
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
   *                                 recursively parse the entire tree.
   *
   * @return  {Promise}              Promise resolves with any descriptor
   */
  public async loadAnyPath (absPath: string, shallowDir: boolean = false): Promise<DirDescriptor|MDFileDescriptor|CodeFileDescriptor|OtherFileDescriptor> {
    if (await this.isDir(absPath)) {
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
}
