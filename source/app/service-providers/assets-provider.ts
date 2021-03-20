import EventEmitter from 'events'
import path from 'path'
import { app, ipcMain } from 'electron'
import { promises as fs } from 'fs'
import YAML from 'yaml'

export default class AssetsProvider extends EventEmitter {
  /**
   * Defines an array of required defaults files. There must be one for each
   * writer supported by Zettlr.
   *
   * @var {string[]}
   */
  private readonly _requiredDefaults: string[]

  /**
   * Holds the path where defaults files can be found.
   *
   * @var {string}
   */
  private readonly _defaultsPath: string

  constructor () {
    super()
    global.log.verbose('Assets provider starting up ...')

    this._requiredDefaults = [
      'defaults.html.yaml',
      'defaults.pdf.yaml',
      'defaults.docx.yaml',
      'defaults.odt.yaml',
      'defaults.rtf.yaml',
      'defaults.revealjs.yaml',
      'defaults.rst.yaml',
      'defaults.latex.yaml',
      'defaults.plain.yaml',
      'defaults.org.yaml'
    ]

    this._defaultsPath = path.join(app.getPath('userData'), '/defaults')

    global.assets = {
      getDefaultsFor: async (writer: string) => {
        return await this.getDefaultsFor(writer)
      },
      setDefaultsFor: async (writer: string, newDefaults: any) => {
        return await this.setDefaultsFor(writer, newDefaults)
      }
    }

    ipcMain.handle('assets-provider', async (event, message) => {
      const { command, payload } = message

      if (command === 'get-defaults-file') {
        return await this.getDefaultsFor(payload)
      } else if (command === 'set-defaults-file') {
        return await this.setDefaultsFor(payload.writer, payload.contents)
      }
    })
  }

  async init (): Promise<void> {
    // First, ensure all required default files are where they should be
    for (const file of this._requiredDefaults) {
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
   * @param   {string}  writer  The writer, e.g., html or pdf.
   *
   * @return  {Promise<any>}    The defaults (parsed from YAML)
   */
  async getDefaultsFor (writer: string): Promise<any> {
    const file = path.join(this._defaultsPath, `defaults.${writer}.yaml`)
    const yaml = await fs.readFile(file, { encoding: 'utf-8' })
    return YAML.parse(yaml)
  }

  /**
   * Overwrites the defaults for a given writer.
   *
   * @param   {string}   writer       The writer, e.g., html or pdf.
   * @param   {any}      newDefaults  The new defaults (object to be cast to YAML string)
   *
   * @return  {Promise<boolean>}      Whether or not the operation was successful.
   */
  async setDefaultsFor (writer: string, newDefaults: any): Promise<boolean> {
    try {
      const file = path.join(this._defaultsPath, `defaults.${writer}.yaml`)
      const yaml = YAML.stringify(newDefaults)
      await fs.writeFile(file, yaml)
      return true
    } catch (err) {
      global.log.error(`[Assets Provider] Could not save defaults file: ${String(err.message)}`, err)
      return false
    }
  }
}
