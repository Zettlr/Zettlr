/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        AssetsProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This provider manages general assets used by the app which
 *                  are not handled by the dictionary or translation provider.
 *
 * END HEADER
 */

import path from 'path'
import { app, ipcMain, shell } from 'electron'
import { promises as fs } from 'fs'
import YAML from 'yaml'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract, { type IPCAPI } from '../provider-contract'
import type LogProvider from '../log'
import { getCustomProfiles } from '@providers/commands/exporter'
import { SUPPORTED_READERS } from '@common/pandoc-util/pandoc-maps'
import { parseReaderWriter } from '@common/pandoc-util/parse-reader-writer'

export interface PandocProfileMetadata {
  /**
   * The filename of the defaults file
   */
  name: string
  /**
   * The writer, can be an empty string
   */
  writer: string
  /**
   * The reader, can be an empty string
   */
  reader: string
  /**
   * Since Zettlr has a few requirements, we must have writers and readers.
   * While we strive to even support unknown readers and writers, those fields
   * at least have to have a value. If any hasn't, isInvalid will be true.
   */
  isInvalid: boolean
  /**
   * Zettlr ships with a few profiles by default. In order to ensure that there
   * is always a set of minimal profiles to export and import to, Zettlr will
   * ensure that these standard defaults files will always be present. With this
   * flag, renderer elements can additionally indicate that. This helps prevent
   * some misconceptions, i.e. why certain files cannot be deleted.
   */
  isProtected?: boolean
}

export type AssetsProviderIPCAPI = IPCAPI<{
  'get-filter': { filename: string },
  'set-filter': { filename: string, contents: string },
  'rename-filter': { oldName: string, newName: string },
  'remove-filter': { filename: string },
  'list-filter': unknown,
  'list-protected-filter': unknown,
  'get-defaults-file': { filename: string }
  'set-defaults-file': { filename: string, contents: string }
  'rename-defaults-file': { oldName: string, newName: string }
  'remove-defaults-file': { filename: string }
  'get-snippet': { name: string }
  'remove-snippet': { name: string }
  'rename-snippet': { name: string, newName: string }
  'set-snippet': { name: string, contents: string }
  'list-defaults': unknown
  'list-export-profiles': unknown
  'open-defaults-directory': unknown
  'open-snippets-directory': unknown
  'open-filter-directory': unknown
  'list-snippets': unknown
}>

export default class AssetsProvider extends ProviderContract {
  /**
   * Holds the path where defaults files can be found.
   *
   * @var {string}
   */
  private readonly _defaultsPath: string
  /**
   * Holds the path where snippets can be found.
   *
   * @var {string}
   */
  private readonly _snippetsPath: string
  /**
   * Holds the path where Lua filters can be found.
   *
   * @var {string}
   */
  private readonly _filterPath: string
  /**
   * Holds a list of all protected defaults files. Protected defaults files are
   * those that come by default with the app. Protected simply means here that
   * if the user removes such a file, it will be restored immediately. This also
   * applies when the user renames such a file.‚
   *
   * @var {string[]}
   */
  private readonly _protectedDefaults: string[]

  /**
   * Holds a list of all protected filters. Protected filters are those that
   * come by default with the app. Protected here implies the same as for
   * defaults.
   *
   * @var {string[]}
   */
  private readonly _protectedFilters: string[]

  constructor (private readonly _logger: LogProvider) {
    super()

    this._defaultsPath = path.join(app.getPath('userData'), '/defaults')
    this._snippetsPath = path.join(app.getPath('userData'), '/snippets')
    this._filterPath = path.join(app.getPath('userData'), '/lua-filter')
    this._protectedDefaults = []
    this._protectedFilters = []

    ipcMain.handle('assets-provider', async (event, message: AssetsProviderIPCAPI) => {
      const { command, payload } = message
      // NOTE: Any *renderer* who requests a defaults file will always receive
      // the verbatim file contents, not a parsed object. Renderers who need to
      // work with the file contents programmatically should thus make use of
      // the bundled YAML module to parse and stringify the files accordingly.
      if (command === 'get-filter') {
        return await this.getFilter(payload.filename)
      } else if (command === 'set-filter') {
        return await this.setFilter(payload.filename, payload.contents)
      } else if (command === 'rename-filter') {
        return await this.renameFilter(payload.oldName, payload.newName)
      } else if (command === 'remove-filter') {
        return await this.removeFilter(payload.filename)
      } else if (command === 'list-filter') {
        return await this.listFilters()
      } else if (command === 'list-protected-filter') {
        return this.listProtectedFilters()
      } else if (command === 'open-filter-directory') {
        this._logger.info(`[Assets Provider] Opening path ${this._filterPath}`)
        return await shell.openPath(this._filterPath)
      } else if (command === 'get-defaults-file') {
        return await this.getDefaultsFile(payload.filename, true)
      } else if (command === 'set-defaults-file') {
        return await this.setDefaultsFile(payload.filename, payload.contents, true)
      } else if (command === 'rename-defaults-file') {
        return await this.renameDefaultsFile(payload.oldName, payload.newName)
      } else if (command === 'remove-defaults-file') {
        return await this.removeDefaultsFile(payload.filename)
      } else if (command === 'list-defaults') {
        return await this.listDefaults()
      } else if (command === 'list-export-profiles') {
        const profiles = await this.listDefaults()
        return profiles.concat(getCustomProfiles())
      } else if (command === 'open-defaults-directory') {
        this._logger.info(`[AssetsProvider] Opening path ${this._defaultsPath}`)
        return await shell.openPath(this._defaultsPath)
      } else if (command === 'get-snippet') {
        return await this.getSnippet(payload.name)
      } else if (command === 'set-snippet') {
        return await this.setSnippet(payload.name, payload.contents)
      } else if (command === 'remove-snippet') {
        return await this.removeSnippet(payload.name)
      } else if (command === 'list-snippets') {
        return await this.listSnippets()
      } else if (command === 'rename-snippet') {
        return await this.renameSnippet(payload.name, payload.newName)
      } else if (command === 'open-snippets-directory') {
        this._logger.info(`[AssetsProvider] Opening path ${this._snippetsPath}`)
        return await shell.openPath(this._snippetsPath)
      }
    })
  }

  async boot (): Promise<void> {
    this._logger.verbose('Assets provider starting up ...')
    // First, ensure all required default files are where they should be.
    // Required are those defaults files which are in the assets/defaults
    // directory

    const defaultsFiles = await fs.readdir(path.join(__dirname, './assets/defaults'))
    const defaults = defaultsFiles.filter(file => /\.ya?ml$/.test(file))
    for (const file of defaults) {
      this._protectedDefaults.push(file)
      const absolutePath = path.join(this._defaultsPath, file)
      try {
        await fs.lstat(absolutePath)
      } catch (err) {
        this._logger.warning(`[Assets Provider] Required defaults file ${file} not found. Copying ...`)
        await fs.copyFile(path.join(__dirname, './assets/defaults', file), absolutePath)
      }
    }

    // Next, do the same for the filters
    const filterFiles = await fs.readdir(path.join(__dirname, './assets/lua-filter'))
    const filters = filterFiles.filter(file => /\.lua$/.test(file))
    for (const file of filters) {
      this._protectedFilters.push(file)
      const absolutePath = path.join(this._filterPath, file)
      try {
        // If the file doesn't exist, lstat will throw an error. Otherwise, check
        // that the filter shipped with this version is newer. If so, replace.
        const existingStat = await fs.lstat(absolutePath)
        const newStat = await fs.lstat(path.join(__dirname, './assets/lua-filter', file))
        if (newStat.mtimeMs > existingStat.mtimeMs) {
          this._logger.warning(`[Assets Provider] Found outdated filter ${file}; copying ...`)
          await fs.copyFile(path.join(__dirname, './assets/lua-filter', file), absolutePath)
        }
      } catch (err) {
        this._logger.warning(`[Assets Provider] Required filter ${file} not found. Copying ...`)
        await fs.copyFile(path.join(__dirname, './assets/lua-filter', file), absolutePath)
      }
    }
  }

  /**
   * Shuts down the provider
   *
   * @return  {Promise<void>} Resolves after successful shutdown
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Assets provider shutting down ...')
  }

  //////////////////////////////////////////////////////////////////////////////
  /////////////////////////////////  FILTERS  //////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Lists all filters installed in the system.
   *
   * @param   {string}           filename  The filter name
   *
   * @return  {Promise<string>}            The filter contents
   */
  async getFilter (filename: string): Promise<string> {
    const absPath = path.join(this._filterPath, filename)
    const lua = await fs.readFile(absPath, { encoding: 'utf-8' })
    return lua
  }

  /**
   * Creates/Updates the filter with the provided filename, using the contents.
   *
   * @param   {string}            filename  The filter name
   * @param   {string}            contents  The file contents
   *
   * @return  {Promise<boolean>}            Whether the command succeeded.
   */
  async setFilter (filename: string, contents: string): Promise<boolean> {
    filename = filename.trim()
    if (filename === '') {
      throw new Error('Cannot set Lua filter: Filename was empty.')
    }

    if (!/\.lua$/i.test(filename)) {
      filename += filename.endsWith('.') ? 'lua' : '.lua'
    }

    const absPath = path.join(this._filterPath, filename)

    try {
      // Stringify the new defaults according to the verbatim flag
      await fs.writeFile(absPath, contents)
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not save lua filter: ${err instanceof Error ? err.message : 'unknown error'}`, err)
      return false
    }
  }

  /**
   * Renames the provided filter.
   *
   * @param   {string}            oldName  The existing name
   * @param   {string}            newName  The new name
   *
   * @return  {Promise<boolean>}           Whether the command succeeded.
   */
  async renameFilter (oldName: string, newName: string): Promise<boolean> {
    newName = newName.trim()
    oldName = oldName.trim()
    if (newName === '' || oldName === '') {
      throw new Error('Cannot rename lua filter: Filename was empty.')
    }

    if (!/\.lua$/i.test(newName)) {
      newName += newName.endsWith('.') ? 'lua' : '.lua'
    }

    const oldPath = path.join(this._filterPath, oldName)
    const newPath = path.join(this._filterPath, newName)

    try {
      await fs.rename(oldPath, newPath)
      if (this._protectedFilters.includes(oldName)) {
        await this.restoreFilterFor(oldName)
      }
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not rename lua filter from ${oldPath} to ${newPath}.`, err)
      return false
    }
  }

  /**
   * Removes the filter with the provided name.
   *
   * @param   {string}            filename  The filter name
   *
   * @return  {Promise<boolean>}            Whether the command succeeded.
   */
  async removeFilter (filename: string): Promise<boolean> {
    const absPath = path.join(this._filterPath, filename)
    try {
      await fs.unlink(absPath)
      // If removing that file removed a protected one, restore it immediately.
      // This is effectively the same as restoring the file.
      if (this._protectedFilters.includes(filename)) {
        await this.restoreFilterFor(filename)
      }
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not remove lua filter: ${absPath}`, err)
      return false
    }
  }

  /**
   * Restores the file for a provided filter name.
   *
   * @param   {string}            filename  The filter name
   *
   * @return  {Promise<boolean>}            Whether the command succeeded.
   */
  async restoreFilterFor (filename: string): Promise<boolean> {
    const source = path.join(__dirname, './assets/lua-filter', filename)
    const target = path.join(this._filterPath, filename)

    try {
      await fs.copyFile(source, target)
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not restore filter file ${filename}!`, err)
      return false
    }

    return true
  }

  /**
   * Returns all LUA filters that have been found at the LUA filter path
   *
   * @param   {boolean}            returnAbsolutePaths  When `true` (default:
   *                                                    `false`), returns
   *                                                    absolute paths.
   *
   * @return  {Promise<string>[]}                       Resolves with an array
   *                                                    of filters.
   */
  async listFilters (returnAbsolutePaths: boolean = false): Promise<string[]> {
    const files = await fs.readdir(this._filterPath)
    return files
      .filter(file => /\.lua$/i.test(file))
      .map(file => returnAbsolutePaths ? path.join(this._filterPath, file) : file)
  }

  /**
   * Lists protected filters
   *
   * @return  {string[]}  A list of protected filters
   */
  public listProtectedFilters (): string[] {
    return this._protectedFilters
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////  DEFAULTS  //////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Gets the defaults file for a given writer
   *
   * @param   {string}             filename   The profile's filename
   * @param   {boolean}            verbatim   If false, the contents will be serialized to YAML
   *
   * @return  {Promise<any>}    The defaults (parsed from YAML)
   */
  async getDefaultsFile (filename: string, verbatim: boolean = false): Promise<any|string> {
    const absPath = path.join(this._defaultsPath, filename)
    const yaml = await fs.readFile(absPath, { encoding: 'utf-8' })
    // Either return the string contents or a JavaScript object
    return (verbatim) ? yaml : YAML.parse(yaml)
  }

  /**
   * Overwrites the defaults for a given writer.
   *
   * @param   {string}            filename      The file to write
   * @param   {string}            newDefaults   The new defaults
   * @param   {boolean}           verbatim      If false, newDefaults will be serialized to YAML
   *
   * @return  {Promise<boolean>}      Whether or not the operation was successful.
   */
  async setDefaultsFile (filename: string, newDefaults: string, verbatim: boolean = false): Promise<boolean> {
    filename = filename.trim()
    if (filename === '') {
      throw new Error('Cannot set defaults file: Filename was empty.')
    }

    if (!/\.ya?ml$/i.test(filename)) {
      filename += filename.endsWith('.') ? 'yaml' : '.yaml'
    }

    const absPath = path.join(this._defaultsPath, filename)

    try {
      // Stringify the new defaults according to the verbatim flag
      const yaml = (verbatim) ? newDefaults : YAML.stringify(newDefaults)
      await fs.writeFile(absPath, yaml)
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not save defaults file: ${err instanceof Error ? err.message : 'unknown error'}`, err)
      return false
    }
  }

  /**
   * Allows one to rename a defaults file
   *
   * @param   {string}            oldName  The former path to the file
   * @param   {string}            newName  The new path to the file
   *
   * @return  {Promise<boolean>}           True upon success
   */
  async renameDefaultsFile (oldName: string, newName: string): Promise<boolean> {
    newName = newName.trim()
    oldName = oldName.trim()
    if (newName === '' || oldName === '') {
      throw new Error('Cannot rename defaults file: Filename was empty.')
    }

    if (!/\.ya?ml$/i.test(newName)) {
      newName += newName.endsWith('.') ? 'yaml' : '.yaml'
    }

    const oldPath = path.join(this._defaultsPath, oldName)
    const newPath = path.join(this._defaultsPath, newName)

    try {
      await fs.rename(oldPath, newPath)
      // If renaming that file removed a protected one, restore it immediately.
      // This is effectively the same as duplicating the file.
      if (this._protectedDefaults.includes(oldName)) {
        await this.restoreDefaultsFor(oldName)
      }
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not rename file ${oldPath} to ${newPath}.`, err)
      return false
    }
  }

  /**
   * Removes the given defaults file. NOTE that any default profiles will be
   * restored on the next start of the app, so removing them will only be
   * temporary (e.g. for restoring purposes).
   *
   * @param   {string}            filename  The defaults file's name
   *
   * @return  {Promise<boolean>}           Returns true upon success
   */
  async removeDefaultsFile (filename: string): Promise<boolean> {
    const absPath = path.join(this._defaultsPath, filename)
    try {
      await fs.unlink(absPath)
      // If removing that file removed a protected one, restore it immediately.
      // This is effectively the same as restoring the file.
      if (this._protectedDefaults.includes(filename)) {
        await this.restoreDefaultsFor(filename)
      }
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not remove defaults file: ${absPath}`, err)
      return false
    }
  }

  /**
   * Restores the requested defaults file by copying it from the directory
   * within Zettlr into the defaults path (user data).
   *
   * @param   {string}             filename  The defaults file to copy over
   *
   * @return  {Promise<boolean>}           Returns true on success
   */
  async restoreDefaultsFor (filename: string): Promise<boolean> {
    const source = path.join(__dirname, './assets/defaults', filename)
    const target = path.join(this._defaultsPath, filename)

    try {
      await fs.copyFile(source, target)
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not restore defaults file ${filename}!`, err)
      return false
    }

    return true
  }

  /**
   * Lists every Pandoc defaults file/profile installed
   *
   * @return  {Promise<PandocProfileMetadata[]>}The parsed metadata for all profiles
   */
  async listDefaults (): Promise<PandocProfileMetadata[]> {
    const profiles: PandocProfileMetadata[] = []

    const defaultsFiles = await fs.readdir(this._defaultsPath)
    const defaults = defaultsFiles.filter(file => /\.ya?ml$/.test(file))
    for (const file of defaults) {
      const absolutePath = path.join(this._defaultsPath, file)
      try {
        const contents = await fs.readFile(absolutePath, { encoding: 'utf-8' })
        const yaml = YAML.parse(contents)

        // A defaults file needs to fulfill three conditions in order to be
        // considered valid: (1) has a writer, (2) has a reader, (3) either
        // reader or writer must be a supported Markdown format.
        const hasWriter = yaml.writer !== undefined
        const hasReader = yaml.reader !== undefined
        const validWriter = hasWriter && SUPPORTED_READERS.includes(parseReaderWriter(yaml.writer as string).name)
        const validReader = hasReader && SUPPORTED_READERS.includes(parseReaderWriter(yaml.reader as string).name)

        profiles.push({
          name: file,
          writer: yaml.writer,
          reader: yaml.reader,
          isInvalid: !(hasWriter && hasReader && (validWriter || validReader)),
          isProtected: this._protectedDefaults.includes(file)
        })
      } catch (err) {
        this._logger.warning(`[Assets Provider] Installed profile ${file} had an error and could not be parsed`)
        profiles.push({
          name: file,
          writer: '',
          reader: '',
          isInvalid: true,
          isProtected: this._protectedDefaults.includes(file)
        })
      }
    }

    return profiles
  }

  //////////////////////////////////////////////////////////////////////////////
  ////////////////////////////////  SNIPPETS  //////////////////////////////////
  //////////////////////////////////////////////////////////////////////////////

  /**
   * Retrieves a snippet with the given name. Throws an error if the file does not exist.
   *
   * @param   {string}           name  The snippet file name (sans extension)
   *
   * @return  {Promise<string>}        The file contents
   */
  async getSnippet (name: string): Promise<string> {
    if (!name.toLowerCase().endsWith('.tpl.md')) {
      name += '.tpl.md'
    }

    const filePath = path.join(this._snippetsPath, name)
    return await fs.readFile(filePath, { encoding: 'utf-8' })
  }

  /**
   * Sets a snippet file with the given content. Overwrites existing files. Can
   * be used to create new snippet files.
   *
   * @param   {string}            name     The snippet file name (sans extension)
   * @param   {string}            content  The new contents of the file
   *
   * @return  {Promise<boolean>}           Returns false if there was an error
   */
  async setSnippet (name: string, content: string): Promise<boolean> {
    name = name.trim()
    if (name === '') {
      throw new Error('Cannot set snippet: Name was empty.')
    }

    if (!name.toLowerCase().endsWith('.tpl.md')) {
      name += '.tpl.md'
    }

    try {
      const filePath = path.join(this._snippetsPath, name)
      await fs.writeFile(filePath, content)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not save snippets file: ${err instanceof Error ? err.message : 'unknown error'}`, err)
      return false
    }
  }

  /**
   * Removes a snippet from disk
   *
   * @param   {string}            name  The snippet file name (sans extension)
   *
   * @return  {Promise<boolean>}        Returns false if there was an error
   */
  async removeSnippet (name: string): Promise<boolean> {
    try {
      if (!name.toLowerCase().endsWith('.tpl.md')) {
        name += '.tpl.md'
      }
      const filePath = path.join(this._snippetsPath, name)
      await fs.unlink(filePath)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not remove snippets file: ${err instanceof Error ? err.message : 'unknown error'}`, err)
      return false
    }
  }

  /**
   * Renames a snippet
   *
   * @param   {string}            name     The old name
   * @param   {string}            newName  The new snippet name
   *
   * @return  {Promise<boolean>}           Returns false if there was an error.
   */
  async renameSnippet (name: string, newName: string): Promise<boolean> {
    name = name.trim()
    newName = newName.trim()

    if (name === '' || newName === '') {
      throw new Error('Cannot rename snippet: Name was empty.')
    }

    if (!name.endsWith('.tpl.md')) {
      name += '.tpl.md'
    }

    if (!newName.endsWith('.tpl.md')) {
      newName += '.tpl.md'
    }

    try {

      const oldPath = path.join(this._snippetsPath, name)
      const newPath = path.join(this._snippetsPath, newName)
      await fs.rename(oldPath, newPath)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: unknown) {
      this._logger.error(`[Assets Provider] Could not rename snippets file: ${err instanceof Error ? err.message : 'unknown error'}`, err)
      return false
    }
  }

  /**
   * Lists all snippets that are stored on this computer.
   *
   * @return  {Promise<string[]>}  The promise resolves with a list of existing snippets.
   */
  async listSnippets (): Promise<string[]> {
    const files = await fs.readdir(this._snippetsPath)
    const snippetFiles = files.filter(file => /\.tpl\.md$/.test(file))
    return snippetFiles.map(file => file.replace(/\.tpl\.md$/, ''))
  }
}
