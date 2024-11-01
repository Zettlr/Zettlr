/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        PersistentDataContainer
 * CVM-Role:        Model
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     The persistent data container is a simple class that allows
 *                  one to continuously persist some data to disk. The container
 *                  will make sure to balance disk load and persistence.
 *
 * END HEADER
 */

import { promises as fs, constants as FSConstants } from 'fs'
import { parse as parseYAML, stringify as stringifyYAML } from 'yaml'

export default class PersistentDataContainer<T = any> {
  /**
   * The absolute path to the data file. Must include the file extension (e.g.,
   * yaml or json).
   *
   * @var {string}
   */
  private readonly _filePath: string
  /**
   * The datatype with which the container should store the data on disk, can be
   * either yaml or json.
   *
   * @var {'yaml'|'json'}
   */
  private readonly _dataType: 'yaml'|'json'
  /**
   * The data of the container. Initially set to undefined, after initializing/
   * getting of the data, contains the most recent data. Will be overwritten by
   * calling set()
   *
   * @var {T}
   */
  private _data: T

  /**
   * Holds the most recent timeout for writing the data to disk if applicable
   *
   * @var {NodeJS.Timeout|undefined}
   */
  private _timeout: NodeJS.Timeout|undefined

  /**
   * The delay (in milliseconds) of wait before actually writing the data to
   * disk.
   *
   * @var {number}
   */
  private _delay: number

  /**
   * Creates a new persistent data container.
   *
   * @param   {string}         filePath  The absolute path to the data file
   * @param   {'yaml'|'json'}  type      The file format to use, defaults to JSON
   * @param   {number}         delay     The time to wait before writing, defaults to 1000ms
   *
   * @return  {PersistentDataContainer}  The file container
   */
  constructor (filePath: string, type: 'yaml'|'json' = 'json', delay: number = 1000) {
    this._filePath = filePath
    this._dataType = type
    this._delay = delay
  }

  /**
   * Initializes the container with some data. Must be called before get()
   *
   * @param   {T}      initialData  The initial data to write into the file
   */
  public async init (initialData: T): Promise<void> {
    if (initialData === undefined || initialData === null) {
      throw new Error('Cannot initialize data storage with null or undefined!')
    }

    this._data = initialData
    await fs.writeFile(this._filePath, this.stringify(), { encoding: 'utf-8' })
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
      const contents = await fs.readFile(this._filePath, 'utf-8')
      return contents.trim() !== ''
    } catch (err: any) {
      return false
    }
  }

  /**
   * Overwrites the stored data and sets a timeout for writing the data to disk.
   * Writes to disk if no changes occurred after the set amount of delay. NOTE
   * that passing non-serializable objects such as functions will lead to data
   * loss or can throw errors.
   *
   * @param   {T}   newData  The new data
   */
  public set (newData: T): void {
    if (newData === undefined || newData === null) {
      throw new Error('Cannot set the data to "undefined" or "null"!')
    }

    // Clone the data so it becomes detached from the caller. This also ensures
    // that this function already throws an error if the data cannot be serialized.
    this._data = JSON.parse(JSON.stringify(newData))

    if (this._timeout !== undefined) {
      clearTimeout(this._timeout)
    }

    this._timeout = setTimeout(() => { this.flushToDisk() }, this._delay)
  }

  /**
   * Reads the data file and returns the data
   *
   * @return  {Promise<Partial<T>>}  Resolves with the data contained in the file. NOTE that the returned type is a partial T to indicate that the container does not perform a sanity check on the data
   */
  public async get (): Promise<Partial<T>> {
    if (this._timeout !== undefined) {
      // _data contains the most recent iteration, NOT the datafile. So return
      // that one instead.
      return this._data
    }

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

    return this._data
  }

  /**
   * Changes the delay of waiting time before writing (in milliseconds)
   *
   * @param   {number}  delay  The new delay in ms
   */
  public setDelay (delay: number): void {
    this._delay = delay
  }

  /**
   * Flushes the content to disk if it has been modified in the meantime
   */
  private flushToDisk (): void {
    if (this._data === undefined) {
      return // No need to flush the data
    }

    if (this._timeout !== undefined) {
      clearTimeout(this._timeout)
      this._timeout = undefined
    }

    // TODO: Proper logging
    fs.writeFile(this._filePath, this.stringify(), { encoding: 'utf-8' })
      .catch(err => { console.error(err) })
  }

  /**
   * Stringifies the data to be written to disk according to the data type
   *
   * @return  {string}  The contained data as a serialized string
   */
  private stringify (): string {
    if (this._dataType === 'json') {
      // By passing a space as the third character, we make the JSON readable
      return JSON.stringify(this._data, undefined, '  ')
    } else {
      return stringifyYAML(this._data)
    }
  }

  /**
   * This shuts down the container. Can be used to speed up the shutdown of the
   * node process since this will clear the timeout and immediately write the
   * data to disk.
   */
  public shutdown (): void {
    if (this._timeout !== undefined) {
      this.flushToDisk() // One last flush to disk to prevent data loss
    }
  }
}
