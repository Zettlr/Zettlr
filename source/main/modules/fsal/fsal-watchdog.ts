/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        FSALWatchdog class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Monitors root files and directories for changes of any kind,
 *                  to notify the respective event listeners who can then take
 *                  appropriate action.
 *
 * END HEADER
 */

import chokidar from 'chokidar'
import EventEmitter from 'events'

import ignoreDir from '../../../common/util/ignore-dir'
import ignoreFile from '../../../common/util/ignore-file'
import isFile from '../../../common/util/is-file'
import isDir from '../../../common/util/is-dir'
import isAttachment from '../../../common/util/is-attachment'

import { ignoreDirs as IGNORE_DIR_REGEXP } from '../../../common/data.json'

import { WatchdogEvent } from './types'

export default class FSALWatchdog extends EventEmitter {
  _booting: boolean
  _process: any
  _paths: string[]
  _ignoredEvents: WatchdogEvent[]

  /**
   * Create a new watcher instance
   * @param {String} path The path to projectDir
   */
  constructor () {
    super() // Setup the Event Emitter
    this._booting = false
    this._process = null
    this._paths = []
    this._ignoredEvents = []
  }

  /**
   * Shuts down the service provider.
   * @return {void} No return.
   */
  shutdown (): void {
    if (!this._process) return
    this._process.close()
  }

  /**
   * Initiate watching process and stage all changes in the staged-array
   */
  start (): this {
    // Don't boot up twice and only boot if there's at least one path
    if (this._paths.length < 1 || this.isBooting()) return this

    this._booting = true // Lock the start function

    // chokidar's ignored-setting is compatible to anymatch, so we can
    // pass an array containing the standard dotted directory-indicators,
    // directories that should be ignored and a function that returns true
    // for all files that are _not_ in the filetypes list (whitelisting)
    // Further reading: https://github.com/micromatch/anymatch
    let ignoreDirs = [/(^|[/\\])\../]

    // Create new regexps from the strings
    for (let x of IGNORE_DIR_REGEXP) ignoreDirs.push(new RegExp(x, 'i'))

    let options = {
      'ignored': ignoreDirs,
      'persistent': true,
      'ignoreInitial': true, // Do not track the initial watch as changes
      'followSymlinks': true, // Follow symlinks TODO need to implement that in the FSAL as well
      'ignorePermissionErrors': true // In the worst case one has to reboot the software, but so it looks nicer.
    }

    if (global.config.get('watchdog.activatePolling')) {
      let threshold: number = global.config.get('watchdog.stabilityThreshold')
      if (typeof threshold !== 'number') threshold = 1000
      if (threshold < 0) threshold = 1000

      // From chokidar docs: "[...] in some cases some change events will be
      // emitted while the file is being written." --> hence activate this.
      // options.awaitWriteFinish = { TODO
      //   'stabilityThreshold': threshold,
      //   'pollInterval': 100
      // }

      global.log.info(`[FSAL Watchdog] Activating file polling with a threshold of ${threshold}ms.`)
    }

    // Begin watching the pushed paths
    this._process = chokidar.watch(this._paths, options)

    this._process.on('ready', () => {
      // Add all paths that may have been added to the array while the process
      // was starting up.
      let alreadyWatched = Object.keys(this._process.getWatched())
      for (let p of this._paths) {
        if (!alreadyWatched.includes(p)) {
          this._process.add(p)
        }
      }
      this._booting = false // Unlock the start function
    })

    this._process.on('all', (event: string, p: string) => {
      // Should we ignore that event?
      let shouldIgnore = this._ignoredEvents.findIndex(e => {
        return e.event === event && e.path === p
      })

      if (shouldIgnore > -1) {
        // Yup
        let i = this._ignoredEvents[shouldIgnore]
        global.log.info(`[WATCHDOG] Ignore event: ${i.event}:${i.path}`)
        this._ignoredEvents.splice(shouldIgnore, 1)
        return
      }

      // Determine that these are real and valid files/dirs
      let dir = (event === 'unlinkDir') ? true : isDir(p)
      let file = (event === 'unlink') ? true : isFile(p)
      let attachment = isAttachment(p, event === 'unlink')

      // Only watch changes in directories and supported files
      if ((dir && !ignoreDir(p)) || (file && (!ignoreFile(p) || attachment))) {
        global.log.info(`[WATCHDOG] Emitting event: ${event}:${p}`)
        // Emit the event for the respective path.
        this.emit('change', event, p)
      }
    })

    return this
  }

  /**
   * Is the process currently booting up?
   * @return {Boolean} True, if it's booting and false if it's not.
   */
  isBooting (): boolean {
    return this._booting
  }

  /**
   * Adds a path to the currently watched paths
   * @param {String} p A new directory or file to be watched
   */
  watch (p: string): this {
    if (this._paths.includes(p)) return this

    // Add the path to the watched
    this._paths.push(p)

    if (!this._process && !this.isBooting()) {
      // Boot the watchdog if not done yet.
      this.start()
    } else if (!this.isBooting()) {
      // If the watchdog is ready, the _process may accept new files and
      // folders. As soon as the watchdog becomes ready, it will automatically
      // add all _paths to watch that have been collected during the startup
      // of the watchdog.
      this._process.add(p)
    }

    return this
  }

  /**
   * Removes a path from the watchdog process
   * @param  {String} p The path to be unwatched
   * @return {ZettlrWatchdog}   This for chainability
   */
  unwatch (p: string): this {
    if (!this._paths.includes(p)) return this

    this._paths.splice(this._paths.indexOf(p), 1)
    this._process.unwatch(p)

    return this
  }

  /**
   * Adds events in the form { path: '', event: '' } to the ignore list.
   * @param {Array} events An array of path/event-objects to ignore
   */
  ignoreEvents (events: WatchdogEvent[]): boolean {
    if (events.length === 0) return false

    this._ignoredEvents = this._ignoredEvents.concat(events)

    return true
  }
}
