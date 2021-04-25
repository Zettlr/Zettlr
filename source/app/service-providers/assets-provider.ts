import EventEmitter from 'events'
import path from 'path'
import { app, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import YAML from 'yaml'

export default class AssetsProvider extends EventEmitter {
  /**
   * Holds the path where defaults files can be found.
   *
   * @var {string}
   */
  private readonly _defaultsPath: string

  constructor () {
    super()
    global.log.verbose('Assets provider starting up ...')

    this._defaultsPath = path.join(app.getPath('userData'), '/defaults')

    global.assets = {
      getDefaultsFor: async (format: string, type: 'import'|'export') => {
        return await this.getDefaultsFor(format, type)
      },
      setDefaultsFor: async (format: string, type: 'import'|'export', newDefaults: any) => {
        return await this.setDefaultsFor(format, type, newDefaults)
      }
    }

    ipcMain.handle('assets-provider', async (event, message) => {
      const { command, payload } = message

      if (command === 'get-defaults-file') {
        return await this.getDefaultsFor(payload.format, payload.type)
      } else if (command === 'set-defaults-file') {
        return await this.setDefaultsFor(payload.format, payload.type, payload.contents)
      }
    })
  }

  async init (): Promise<void> {
    const files = await fs.readdir(path.join(__dirname, './assets/defaults'))
    const defaults = files.filter(file => /^(?:import|export)\..+?\.yaml$/.test(file))
    // First, ensure all required default files are where they should be.
    // Required are those defaults files which are in the assets/defaults directory
    // and correspond to the format (import|export).(writer|reader).yaml
    for (const file of defaults) {
      const absolutePath = path.join(this._defaultsPath, file)
      try {
        await fs.lstat(absolutePath)
      } catch (err) {
        global.log.warning(`[Assets Provider] Required defaults file ${file} not found. Copying ...`)
        await fs.copyFile(path.join(__dirname, './assets/defaults', file), absolutePath)
      }
    }
  }

  /**
   * Shuts down the provider
   *
   * @return  {Promise<void>} Resolves after successful shutdown
   */
  async shutdown (): Promise<void> {
    global.log.verbose('Assets provider shutting down ...')
  }

  /**
   * Gets the defaults file for a given writer
   *
   * @param   {string}             format  The writer, e.g., html or pdf.
   * @param   {'export'|'import'}  type    The type of the defaults file
   *
   * @return  {Promise<any>}    The defaults (parsed from YAML)
   */
  async getDefaultsFor (format: string, type: 'export'|'import'): Promise<any> {
    const file = path.join(this._defaultsPath, `${type}.${format}.yaml`)
    const yaml = await fs.readFile(file, { encoding: 'utf-8' })
    return YAML.parse(yaml)
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
  async setDefaultsFor (format: string, type: 'export'|'import', newDefaults: any): Promise<boolean> {
    try {
      const file = path.join(this._defaultsPath, `${type}.${format}.yaml`)
      const yaml = YAML.stringify(newDefaults)
      await fs.writeFile(file, yaml)
      return true
    } catch (err) {
      global.log.error(`[Assets Provider] Could not save defaults file: ${String(err.message)}`, err)
      return false
    }
  }
}
