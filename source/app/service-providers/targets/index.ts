/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TargetProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Enables the implementation of writing targets.
 *
 * END HEADER
 */

import EventEmitter from 'events'
import path from 'path'
import { app, ipcMain } from 'electron'
import ProviderContract from '../provider-contract'
import type FSAL from '../fsal'
import type LogProvider from '../log'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import broadcastIPCMessage from '@common/util/broadcast-ipc-message'

export interface WritingTarget {
  path: string
  mode: 'words'|'chars'
  count: number
}

/**
 * This class manages the writing targets of directories and files. It reads the
 * targets on each start of the app and writes them after they have been changed.
 */
export default class TargetProvider extends ProviderContract {
  private readonly _file: string
  private readonly container: PersistentDataContainer<WritingTarget[]>
  private readonly _emitter: EventEmitter
  private _targets: WritingTarget[]
  /**
   * Create the instance on program start and initially load the targets.
   */
  constructor (private readonly _logger: LogProvider, private readonly _fsal: FSAL) {
    super()

    this._file = path.join(app.getPath('userData'), 'targets.json')
    this.container = new PersistentDataContainer(this._file, 'json')
    this._targets = []

    this._emitter = new EventEmitter()

    ipcMain.handle('targets-provider', (event, payload) => {
      const { command } = payload

      if (command === 'get-targets') {
        return this._targets
      } else if (command === 'set-writing-target') {
        return this.set(payload.payload)
      }
    })
  }

  public async boot (): Promise<void> {
    if (!await this.container.isInitialized()) {
      await this.container.init([])
    } else {
      this._targets = (await this.container.get()).filter(t => t !== undefined)
      await this.verify()
    }
  }

  /**
   * Adds callback to the event listeners
   * @param  {String}   event    The event to be listened for.
   * @param  {Function} callback The callback when the event is emitted.
   * @return {void}              Nothing to return.
   */
  on (event: string, callback: (...args: any[]) => void): void {
    this._emitter.on(event, callback)
  }

  /**
   * Removes an event listener
   * @param  {String}   event    The event the listener was subscribed to
   * @param  {Function} callback The callback
   * @return {void}              Nothing to return.
   */
  off (event: string, callback: (...args: any[]) => void): void {
    this._emitter.off(event, callback)
  }

  async shutdown (): Promise<void> {
    this._logger.verbose('Target provider shutting down ...')
    this.container.shutdown()
  }

  /**
   * Verifies the validity of all targets.
   * @return {ZettlrTargets} Chainability.
   */
  async verify (): Promise<void> {
    // A target is defined to be "valid" if it contains a valid integer number
    // as the target word/char count, and the corresponding file/folder is still
    // loaded within the app.
    const validTargets = []
    for (const target of this._targets) {
      // count must be a number
      if (typeof target.count !== 'number') {
        continue
      }

      // Mode must be either words or chars
      if (![ 'words', 'chars' ].includes(target.mode)) {
        continue
      }

      // Now check if the file still exists.
      if (!await this._fsal.isFile(target.path)) {
        continue
      }

      // If a target made it until here, push it (to the limit)
      validTargets.push(target)
    }

    // Overwrite with only the list of valid targets
    this._targets = validTargets
  }

  /**
   * Returns a target based upon the file's/dir's hash (or all, if no has was provided)
   * @param  {string}  filePath  The path to be searched for
   * @return {WritingTarget|undefined}      A target, if set
   */
  get (filePath: string): WritingTarget|undefined {
    if (filePath === undefined) {
      return undefined
    }

    return this._targets.find((elem) => {
      return elem.path === filePath
    })
  }

  /**
   * Add or change a given tag. If a tag with "name" exists, it will be overwritten, else added.
   *
   * @param {WritingTarget} target  The target to set
   */
  set (target: WritingTarget): void {
    // Pass a count smaller or equal zero to remove.
    if (target.count <= 0) {
      this.remove(target.path)
      return
    }

    // Either update or add the target.
    const existingTarget = this._targets.find(e => e.path === target.path)
    if (existingTarget !== undefined) {
      existingTarget.mode = target.mode
      existingTarget.count = target.count
    } else {
      this._targets.push(target)
    }

    broadcastIPCMessage('targets-provider', 'writing-targets-updated')
    this.container.set(this._targets)

    // Inform the respective file that its target has been updated.
    this._emitter.emit('update', target.path)
  }

  /**
   * Removes a target from the array and reports the success of the operation.
   * @param  {number} hash The hash to be searched for and removed.
   * @return {boolean}      Whether or not the operation succeeded.
   */
  remove (filePath: string): boolean {
    const target = this._targets.find(e => e.path === filePath)

    if (target === undefined) {
      return false
    }

    this._targets.splice(this._targets.indexOf(target), 1)
    broadcastIPCMessage('targets-provider', 'writing-targets-updated')
    this.container.set(this._targets)

    // Inform the respective file that its target has been removed.
    this._emitter.emit('remove', filePath)

    return true
  }
}
