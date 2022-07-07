/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ConfigFileContainer
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The config file container is a simple class that allows one
 *                  to continuously persist some data to disk. The container
 *                  will make sure to balance disk load and persistence.
 *
 * END HEADER
 */

import { promises as fs, constants as FSConstants } from 'fs'
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml'

export default class ConfigFileContainer {
  private readonly _filePath: string
  private readonly _dataType: 'yaml'|'json'
  private _data: any
  private _modified: boolean
  private _timeout: number
  private _interval: NodeJS.Timer

  /**
   * Creates a new persistent data container.
   *
   * @param   {string}         filePath  The absolute path to the wanted file
   * @param   {'yaml'|'json'}  type      The file format to use, defaults to JSON
   * @param   {number}         interval  The interval to write to disk, defaults to 1000ms
   *
   * @return  {ConfigFileContainer}      The file container
   */
  constructor (
    filePath: string,
    type: 'yaml'|'json' = 'json',
    interval: number = 1000
  ) {
    this._filePath = filePath
    this._dataType = type
    this._modified = false
    this._timeout = interval
    this.restartInterval()
  }

  /**
   * Initializes the container with some data. Must be called before get()
   *
   * @param   {any}      initialData  The initial data to write into the file
   */
  public async init (initialData: any): Promise<void> {
    this._data = initialData
    if (this._dataType === 'json') {
      await fs.writeFile(this._filePath, JSON.stringify(this._data), { encoding: 'utf-8' })
    } else {
      await fs.writeFile(this._filePath, stringifyYAML(this._data), { encoding: 'utf-8' })
    }
  }

  /**
   * Checks if the data store has already been initialized. If this function
   * returns false, you need to call init() prior.
   *
   * @return  {Promise<boolean>}  Returns whether the store has been initialized
   */
  public async isInitialized (): Promise<boolean> {
    try {
      await fs.access(this._filePath, FSConstants.R_OK | FSConstants.W_OK)
      return true
    } catch (err: any) {
      return false
    }
  }

  /**
   * Overwrites the stored data. On the next interval run, whatever is in
   * newData will be written to disk
   *
   * @param   {any}   newData  The new data
   */
  public set (newData: any): void {
    this._data = newData
    this._modified = true
  }

  /**
   * Reads the data file and returns the data
   *
   * @return  {Promise<any>}  Resolves with the data contained in the file
   */
  public async get (): Promise<any> {
    try {
      const content = await fs.readFile(this._filePath, { encoding: 'utf-8' })

      if (this._dataType === 'json') {
        this._data = JSON.parse(content)
      } else {
        this._data = parseYAML(content)
      }
    } catch (err: any) {
      throw new Error('Could not retrieve container contents: Either the contents were malformed, or you forgot to init the container. ' + String(err.message))
    }

    this._modified = false
    return this._data
  }

  /**
   * Changes the interval of saving to the new number
   *
   * @param   {number}  interval  The new interval in ms
   */
  public setInterval (interval: number): void {
    this._timeout = interval
    this.restartInterval()
  }

  /**
   * Flushes the content to disk if it has been modified in the meantime
   */
  private flushToDisk (): void {
    if (!this._modified || this._data === undefined) {
      return // No need to flush the data
    }

    if (this._dataType === 'json') {
      fs.writeFile(this._filePath, JSON.stringify(this._data), { encoding: 'utf-8' })
      // TODO: Proper logging
        .catch(err => { console.error(err) })
    } else {
      fs.writeFile(this._filePath, stringifyYAML(this._data), { encoding: 'utf-8' })
      // TODO: Proper logging
        .catch(err => { console.error(err) })
    }

    this._modified = false
  }

  /**
   * Restarts the interval timer in case of changes
   */
  private restartInterval (): void {
    clearInterval(this._interval)
    this._interval = setInterval(() => this.flushToDisk(), this._timeout)
  }

  /**
   * This shuts down the container. **MUST** be called for any node process to
   * be successfully shut down, because otherwise you will end up with dangling
   * intervals that prevent the process from quitting normally.
   */
  public shutdown (): void {
    this.flushToDisk() // One last flush to disk to prevent data loss
    clearInterval(this._interval)
  }
}
