/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrTargets class
 * CVM-Role:        Model
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

/**
 * This class manages the writing targets of directories and files. It reads the
 * targets on each start of the app and writes them after they have been changed.
 */
export default class TargetProvider extends EventEmitter {
  private readonly _file: string
  private _targets: WritingTarget[]
  /**
   * Create the instance on program start and initially load the targets.
   */
  constructor () {
    super()
    global.log.verbose('Target provider booting up')
    // Set the maximum amount of listeners to infinity, because in this specific
    // case we don't want only 10 listeners, but as many as needed.
    this.setMaxListeners(Infinity)

    this._file = path.join(app.getPath('userData'), 'targets.json')
    this._targets = []

    this._load()

    // Register a global helper for the targets
    global.targets = {
      /**
       * Adds (or updates) a writing target to the database
       * @param  {Object} target An object describing the new target.
       * @return {void}          Does not return.
       */
      set: (target: WritingTarget) => {
        this.set(target)
      },
      /**
       * Returns a writing target
       * @param  {number}                   hash  The hash to be searched for.
       * @return {WritingTarget|undefined}        The writing target.
       */
      get: (hash: number) => {
        let target = this.get(hash)
        if (target === undefined) {
          return undefined
        }

        return Object.assign({}, target)
      },
      /**
       * Removes a target from the database and returns the operation status.
       * @return {Boolean} Whether or not the target was removed.
       */
      remove: (hash: number) => {
        return this.remove(hash)
      },
      /**
       * Adds callback to the event listeners
       * @param  {String}   event    The event to be listened for.
       * @param  {Function} callback The callback when the event is emitted.
       * @return {void}              Nothing to return.
       */
      on: (event: string, callback: (...args: any[]) => void) => {
        this.on(event, callback)
      },
      /**
       * Removes an event listener
       * @param  {String}   event    The event the listener was subscribed to
       * @param  {Function} callback The callback
       * @return {void}              Nothing to return.
       */
      off: (event: string, callback: (...args: any[]) => void) => {
        this.off(event, callback)
      },
      verify: () => {
        return this.verify()
      }
    }
  } // End constructor

  async shutdown (): Promise<void> {
    global.log.verbose('Target provider shutting down ...')
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
    } catch (e) {
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
  verify (): void {
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

      // Now check if the file still exists.
      if (global.application.findFile(target.hash) === null) {
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
  get (hash: number): WritingTarget|undefined {
    if (hash === undefined) {
      return undefined
    }

    if (typeof hash !== 'number') {
      hash = parseInt(hash)
    }

    return this._targets.find((elem) => {
      return elem.hash === hash
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
      this.remove(target.hash)
      return
    }

    // Either update or add the target.
    let existingTarget = this._targets.find(e => e.hash === target.hash)
    if (existingTarget !== undefined) {
      existingTarget.mode = target.mode
      existingTarget.count = target.count
    } else {
      this._targets.push(target)
    }

    this._save()

    // Inform the respective file that its target has been updated.
    this.emit('update', target.hash)
  }

  /**
   * Removes a target from the array and reports the success of the operation.
   * @param  {number} hash The hash to be searched for and removed.
   * @return {boolean}      Whether or not the operation succeeded.
   */
  remove (hash: number): boolean {
    // Make sure hash is really a number
    if (typeof hash !== 'number') {
      hash = parseInt(hash)
    }

    let target = this._targets.find(e => e.hash === hash)

    if (target === undefined) {
      return false
    }

    this._targets.splice(this._targets.indexOf(target), 1)
    this._save()

    // Inform the respective file that its target has been removed.
    this.emit('remove', hash)

    return true
  }
}
