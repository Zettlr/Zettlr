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

const fs = require('fs')
const EventEmitter = require('events')
const path = require('path')

/**
 * This class manages the writing targets of directories and files. It reads the
 * targets on each start of the app and writes them after they have been changed.
 */
module.exports = class TargetProvider extends EventEmitter {
  /**
   * Create the instance on program start and initially load the targets.
   */
  constructor () {
    super()
    global.log.verbose('Target provider booting up')
    // Set the maximum amount of listeners to infinity, because in this specific
    // case we don't want only 10 listeners, but as many as needed.
    this.setMaxListeners(Infinity)

    this._file = path.join(require('electron').app.getPath('userData'), 'targets.json')
    this._targets = []

    this._load()

    // Register a global helper for the targets
    global.targets = {
      /**
       * Adds (or updates) a writing target to the database
       * @param  {Object} target An object describing the new target.
       * @return {void}          Does not return.
       */
      set: (target) => { this.set(target.hash, target.mode, target.count) },
      /**
       * Returns a writing target
       * @param  {number} hash The hash to be searched for.
       * @return {Object}      The writing target.
       */
      get: (hash) => {
        let t = this.get(hash)
        if (!t) return undefined
        // Create a copy to prevent intrusion.
        return JSON.parse(JSON.stringify(t))
      },
      /**
       * Removes a target from the database and returns the operation status.
       * @return {Boolean} Whether or not the target was removed.
       */
      remove: (hash) => { return this.remove(hash) },
      /**
       * Adds callback to the event listeners
       * @param  {String}   event    The event to be listened for.
       * @param  {Function} callback The callback when the event is emitted.
       * @return {void}              Nothing to return.
       */
      on: (event, callback) => { this.on(event, callback) },
      /**
       * Removes an event listener
       * @param  {String}   event    The event the listener was subscribed to
       * @param  {Function} callback The callback
       * @return {void}              Nothing to return.
       */
      off: (event, callback) => { this.off(event, callback) },
      verify: () => { return this.verify() }
    }
  } // End constructor

  async shutdown () {
    global.log.verbose('Target provider shutting down ...')
    this._save() // Persist to disk
  }

  /**
   * This function loads the targets from disk.
   * @return {ZettlrTargets} This for chainability.
   */
  _load () {
    // We are not checking if the user directory exists, b/c this file will
    // be loaded after the ZettlrConfig, which makes sure the dir exists.

    // Does the file already exist?
    try {
      fs.lstatSync(this._file)
      this._targets = JSON.parse(fs.readFileSync(this._file, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this._file, JSON.stringify([]), { encoding: 'utf8' })
      return this // No need to iterate over objects anymore
    }

    return this
  }

  /**
   * Simply writes the tag data to disk.
   * @return {ZettlrTargets} This for chainability.
   */
  _save () {
    // (Over-)write the targets
    fs.writeFileSync(this._file, JSON.stringify(this._targets), { encoding: 'utf8' })

    return this
  }

  /**
   * Verifies the validity of all targets.
   * @return {ZettlrTargets} Chainability.
   */
  verify () {
    // A target is defined to be "valid" if it contains a valid integer number
    // as the target word/char count, and the corresponding file/folder is still
    // loaded within the app.
    let validTargets = []
    for (let target of this._targets) {
      // count must be a number
      if (typeof target.count !== 'number') continue
      // Mode must be either words or chars
      if (![ 'words', 'chars' ].includes(target.mode)) continue
      // Now check if the file still exists.
      if (!global.application.findFile(target.hash)) continue

      // If a target made it until here, push it (to the limit)
      validTargets.push(target)
    }

    // Overwrite with only the list of valid targets
    this._targets = validTargets

    return this
  }

  /**
   * Returns a target based upon the file's/dir's hash (or all, if no has was provided)
   * @param  {String} [hash=null] The hash to be searched for
   * @return {Object}      Either undefined (as returned by Array.find()) or the tag
   */
  get (hash = null) {
    if (!hash) return this._targets
    if (typeof hash !== 'number') hash = parseInt(hash)

    return this._targets.find((elem) => { return elem.hash === hash })
  }

  /**
   * Add or change a given tag. If a tag with "name" exists, it will be overwritten, else added.
   * @param {string} hash  The hash for which file/dir to set the target.
   * @param {string} mode  The mode. Must be either words or chars, defaults to words.
   * @param {number} count The word count to reach.
   */
  set (hash, mode, count) {
    console.log('***** SETTING TARGET!', hash, mode, count)
    // Sanity checks
    if (![ 'words', 'chars' ].includes(mode)) mode = 'words'

    if (typeof count !== 'number') count = parseInt(count)
    if (typeof hash !== 'number') hash = parseInt(hash)

    // Pass a count smaller or equal zero to remove.
    if (count <= 0) return this.remove(hash)

    // Either update or add the target.
    let target = this._targets.find(e => e.hash === hash)
    if (target) {
      target.mode = mode
      target.count = count
    } else {
      this._targets.push({ 'hash': hash, 'mode': mode, 'count': count })
    }

    this._save()

    // Inform the respective file that its target has been updated.
    this.emit('update', hash)

    return this
  }

  /**
   * Removes a target from the array and reports the success of the operation.
   * @param  {number} hash The hash to be searched for and removed.
   * @return {boolean}      Whether or not the operation succeeded.
   */
  remove (hash) {
    // Make sure hash is really a number
    if (typeof hash !== 'number') hash = parseInt(hash)

    let target = this._targets.find(e => e.hash === hash)
    if (!target) return false

    this._targets.splice(this._targets.indexOf(target), 1)
    this._save()

    // Inform the respective file that its target has been removed.
    this.emit('remove', hash)

    return true
  }
}
