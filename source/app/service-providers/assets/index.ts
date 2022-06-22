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
import { app, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import YAML from 'yaml'
import broadcastIpcMessage from '@common/util/broadcast-ipc-message'
import ProviderContract from '../provider-contract'
import LogProvider from '../log'
import { PandocProfileMetadata } from '@dts/common/assets'
import { getCustomProfiles } from '@providers/commands/exporter'

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

  constructor (private readonly _logger: LogProvider) {
    super()

    this._defaultsPath = path.join(app.getPath('userData'), '/defaults')
    this._snippetsPath = path.join(app.getPath('userData'), '/snippets')
    this._filterPath = path.join(app.getPath('userData'), '/lua-filter')
    this._protectedDefaults = []

    ipcMain.handle('assets-provider', async (event, message) => {
      const { command, payload } = message

      // These function calls, however, treat the defaults files verbatim to
      // retain comments. NOTE: This means that any *renderer* will always
      // receive the text, not an Object. Renderers who need to work with the
      // file contents programmatically should thus make use of the bundled YAML
      // module to parse and stringify the files accordingly.
      if (command === 'get-defaults-file') {
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

  /**
   * Returns all LUA filters that have been found at the LUA filter path
   *
   * @return  {Promise<string>[]}  Resolves with an array of absolute paths
   */
  async getAllFilters (): Promise<string[]> {
    const files = await fs.readdir(this._filterPath)
    return files
      .filter(file => /\.lua$/.test(file))
      .map(file => path.join(this._filterPath, file))
  }

  /**
   * Gets the defaults file for a given writer
   *
   * @param   {string}             filename  The profile's filename
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
   * @param   {string}            absPath      The file to write
   * @param   {any}               newDefaults  The new defaults (object to be cast to YAML string)
   *
   * @return  {Promise<boolean>}      Whether or not the operation was successful.
   */
  async setDefaultsFile (filename: string, newDefaults: any, verbatim: boolean = false): Promise<boolean> {
    const absPath = path.join(this._defaultsPath, filename)

    try {
      // Stringify the new defaults according to the verbatim flag
      const yaml = (verbatim) ? newDefaults : YAML.stringify(newDefaults)
      await fs.writeFile(absPath, yaml)
      return true
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not save defaults file: ${String(err.message)}`, err)
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
    } catch (err: any) {
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
    } catch (err: any) {
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
    } catch (err: any) {
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

        profiles.push({
          name: file,
          writer: yaml.writer,
          reader: yaml.reader,
          isInvalid: yaml.writer === undefined || yaml.reader === undefined,
          isProtected: this._protectedDefaults.includes(file)
        })
      } catch (err) {
        this._logger.warning(`[Assets Provider] Installed profile ${file} had an error and could not be parsed`)
      }
    }

    return profiles
  }

  /**
   * Retrieves a snippet with the given name. Throws an error if the file does not exist.
   *
   * @param   {string}           name  The snippet file name (sans extension)
   *
   * @return  {Promise<string>}        The file contents
   */
  async getSnippet (name: string): Promise<string> {
    const filePath = path.join(this._snippetsPath, name + '.tpl.md')
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
    try {
      const filePath = path.join(this._snippetsPath, name + '.tpl.md')
      await fs.writeFile(filePath, content)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not save snippets file: ${String(err.message)}`, err)
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
      const filePath = path.join(this._snippetsPath, name + '.tpl.md')
      await fs.unlink(filePath)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not remove snippets file: ${String(err.message)}`, err)
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
    try {
      const oldPath = path.join(this._snippetsPath, name + '.tpl.md')
      const newPath = path.join(this._snippetsPath, newName + '.tpl.md')
      await fs.rename(oldPath, newPath)
      broadcastIpcMessage('assets-provider', 'snippets-updated')
      return true
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not rename snippets file: ${String(err.message)}`, err)
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
