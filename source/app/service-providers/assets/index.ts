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

export default class AssetsProvider extends ProviderContract {
  /**
   * Holds the path where defaults files can be found.
   *
   * @var {string}
   */
  private readonly _defaultsPath: string
  private readonly _snippetsPath: string
  private readonly _filterPath: string

  constructor (private readonly _logger: LogProvider) {
    super()

    this._defaultsPath = path.join(app.getPath('userData'), '/defaults')
    this._snippetsPath = path.join(app.getPath('userData'), '/snippets')
    this._filterPath = path.join(app.getPath('userData'), '/lua-filter')

    ipcMain.handle('assets-provider', async (event, message) => {
      const { command, payload } = message

      // These function calls, however, treat the defaults files verbatim to
      // retain comments. NOTE: This means that any *renderer* will always
      // receive the text, not an Object. Renderers who need to work with the
      // file contents programmatically should thus make use of the bundled YAML
      // module to parse and stringify the files accordingly.
      if (command === 'get-defaults-file') {
        return await this.getDefaultsFor(payload.format, payload.type, true)
      } else if (command === 'set-defaults-file') {
        return await this.setDefaultsFor(payload.format, payload.type, payload.contents, true)
      } else if (command === 'restore-defaults-file') {
        return await this.restoreDefaultsFor(payload.format, payload.type)
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
    // Required are those defaults files which are in the assets/defaults directory
    // and correspond to the format (import|export).(writer|reader).yaml

    const defaultsFiles = await fs.readdir(path.join(__dirname, './assets/defaults'))
    const defaults = defaultsFiles.filter(file => /^(?:import|export)\..+?\.yaml$/.test(file))
    for (const file of defaults) {
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
   * @param   {string}             format  The writer, e.g., html or pdf.
   * @param   {'export'|'import'}  type    The type of the defaults file
   *
   * @return  {Promise<any>}    The defaults (parsed from YAML)
   */
  async getDefaultsFor (format: string, type: 'export'|'import', verbatim: boolean = false): Promise<any|string> {
    const file = path.join(this._defaultsPath, `${type}.${format}.yaml`)
    const yaml = await fs.readFile(file, { encoding: 'utf-8' })
    // Either return the string contents or a JavaScript object
    return (verbatim) ? yaml : YAML.parse(yaml)
  }

  /**
   * Overwrites the defaults for a given writer.
   *
   * @param   {string}            format       The writer or reader, e.g., html or pdf.
   * @param   {'export'|'import'} type         The defaults' file type
   * @param   {any}               newDefaults  The new defaults (object to be cast to YAML string)
   *
   * @return  {Promise<boolean>}      Whether or not the operation was successful.
   */
  async setDefaultsFor (format: string, type: 'export'|'import', newDefaults: any, verbatim: boolean = false): Promise<boolean> {
    try {
      const file = path.join(this._defaultsPath, `${type}.${format}.yaml`)
      // Stringify the new defaults according to the verbatim flag
      const yaml = (verbatim) ? newDefaults : YAML.stringify(newDefaults)
      await fs.writeFile(file, yaml)
      return true
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not save defaults file: ${String(err.message)}`, err)
      return false
    }
  }

  /**
   * Restores the requested defaults file by copying it from the directory
   * within Zettlr into the defaults path (user data).
   *
   * @param   {string}             format  The format to copy over
   * @param   {'export'|'import'}  type    The type of defaults file
   *
   * @return  {Promise<boolean>}           Returns true on success
   */
  async restoreDefaultsFor (format: string, type: 'export'|'import'): Promise<boolean> {
    const file = `${type}.${format}.yaml`
    const source = path.join(__dirname, './assets/defaults', file)
    const target = path.join(this._defaultsPath, file)

    try {
      await fs.copyFile(source, target)
    } catch (err: any) {
      this._logger.error(`[Assets Provider] Could not restore defaults file ${type} for ${format}!`, err)
      return false
    }

    return true
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
