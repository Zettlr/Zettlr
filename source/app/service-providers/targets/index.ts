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

import fs from 'fs'
import EventEmitter from 'events'
import path from 'path'
import { app } from 'electron'
import ProviderContract from '../provider-contract'
import FSAL from '../fsal'
import LogProvider from '../log'

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
  private readonly _emitter: EventEmitter
  private _targets: WritingTarget[]
  /**
   * Create the instance on program start and initially load the targets.
   */
  constructor (private readonly _logger: LogProvider) {
    super()

    this._file = path.join(app.getPath('userData'), 'targets.json')
    this._targets = []

    this._load()

    this._emitter = new EventEmitter()
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
    this._save() // Persist to disk
  }

  /**
   * This function loads the targets from disk.
   */
  _load (): void {
    // We are not checking if the user directory exists, b/c this file will
    // be loaded after the ZettlrConfig, which makes sure the dir exists.

    // Does the file already exist?
    try {
      fs.lstatSync(this._file)
      this._targets = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }))
    } catch (err) {
      fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' })
    }
  }

  /**
   * Simply writes the tag data to disk.
   */
  _save (): void {
    // (Over-)write the targets
    fs.writeFileSync(this._file, JSON.stringify(this._targets), { encoding: 'utf8' })
  }

  /**
   * Verifies the validity of all targets.
   * @return {ZettlrTargets} Chainability.
   */
  verify (fsal: FSAL): void {
    // A target is defined to be "valid" if it contains a valid integer number
    // as the target word/char count, and the corresponding file/folder is still
    // loaded within the app.
    let validTargets = []
    for (let target of this._targets) {
      // count must be a number
      if (typeof target.count !== 'number') {
        continue
      }

      // Mode must be either words or chars
      if (![ 'words', 'chars' ].includes(target.mode)) {
        continue
      }

      // Now check if the file still exists. At this point, writing targets set
      // in a Zettlr 1.x branch will be lost because target.path will evaluate
      // to undefined.
      if (fsal.findFile(target.path) === null) {
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
   * @param  {number|null} hash The hash to be searched for
   * @return {WritingTarget|undefined}      Either undefined (as returned by Array.find()) or the tag
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
   * @param {string} hash  The hash for which file/dir to set the target.
   * @param {string} mode  The mode. Must be either words or chars, defaults to words.
   * @param {number} count The word count to reach.
   */
  set (target: WritingTarget): void {
    // Pass a count smaller or equal zero to remove.
    if (target.count <= 0) {
      this.remove(target.path)
      return
    }

    // Either update or add the target.
    let existingTarget = this._targets.find(e => e.path === target.path)
    if (existingTarget !== undefined) {
      existingTarget.mode = target.mode
      existingTarget.count = target.count
    } else {
      this._targets.push(target)
    }

    this._save()

    // Inform the respective file that its target has been updated.
    this._emitter.emit('update', target.path)
  }

  /**
   * Removes a target from the array and reports the success of the operation.
   * @param  {number} hash The hash to be searched for and removed.
   * @return {boolean}      Whether or not the operation succeeded.
   */
  remove (filePath: string): boolean {
    let target = this._targets.find(e => e.path === filePath)

    if (target === undefined) {
      return false
    }

    this._targets.splice(this._targets.indexOf(target), 1)
    this._save()

    // Inform the respective file that its target has been removed.
    this._emitter.emit('remove', filePath)

    return true
  }
}
