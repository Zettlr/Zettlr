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

import { FSWatcher, type WatchOptions } from 'chokidar'

import { ignoreDirs as IGNORE_DIR_REGEXP } from '@common/data.json'

import type LogProvider from '@providers/log'
import type ConfigProvider from '@providers/config'

type ChokidarEvents = 'add'|'addDir'|'change'|'unlink'|'unlinkDir'

// chokidar's ignored-setting is compatible to anymatch, so we can
// pass an array containing the standard dotted directory-indicators,
// directories that should be ignored and a function that returns true
// for all files that are _not_ in the filetypes list (whitelisting)
// Further reading: https://github.com/micromatch/anymatch
const ignoreDirs = [
  // Ignore dot-dirs/files, except .git (to detect changes to possible
  // git-repos) and .ztr-files (which contain, e.g., directory settings)
  // /(?:^|[/\\])\.(?!git|ztr-.+).+/ // /(^|[/\\])\../
  /(?:^|[/\\])\.(?!git$|ztr-[^\\/]+$).+/
]

// Create new regexps from the strings
for (let x of IGNORE_DIR_REGEXP) {
  ignoreDirs.push(new RegExp(x, 'i'))
}

/**
* Represents an event the watchdog can work with
*/
export interface WatchdogEvent {
  event: string
  path: string
}

export default class FSALWatchdog {
  private readonly process: FSWatcher
  private readonly _logger: LogProvider
  private readonly _config: ConfigProvider

  /**
   * Create a new watcher instance
   */
  constructor (watchedPath: string, logger: LogProvider, config: ConfigProvider) {
    this._logger = logger
    this._config = config

    const options: WatchOptions = {
      useFsEvents: process.platform === 'darwin',
      ignored: ignoreDirs,
      persistent: true,
      ignoreInitial: true, // Do not track the initial watch as changes
      followSymlinks: true, // Follow symlinks
      ignorePermissionErrors: true, // In the worst case one has to reboot the software, but so it looks nicer.

      // Chokidar should always be using fsevents, but we will be leaving this
      // in here both in case something happens in the future, and for nostalgic
      // reasons.
      interval: 5000,
      binaryInterval: 5000
    }

    if (this._config.get('watchdog.activatePolling') as boolean) {
      let threshold: number = this._config.get('watchdog.stabilityThreshold')
      if (typeof threshold !== 'number' || threshold < 0) {
        threshold = 1000
      }

      // From chokidar docs: "[...] in some cases some change events will be
      // emitted while the file is being written." --> hence activate this.
      options.awaitWriteFinish = {
        stabilityThreshold: threshold,
        pollInterval: 100
      }

      this._logger.info(`[FSAL Watchdog] Activating file polling with a threshold of ${threshold}ms.`)
    }

    this.process = (new FSWatcher(options)).add(watchedPath)

    this.process.on('ready', () => {
      if (process.platform === 'darwin' && this.process.options.useFsEvents === false) {
        this._logger.warning('[FSAL Watchdog] The chokidar process falls back to polling. This may lead to a high CPU usage.')
      } else if (process.platform === 'darwin' && this.process.options.useFsEvents === true) {
        this._logger.info('[FSAL Watchdog] The chokidar process utilizes fsevents. File changes are detected without polling.')
      }
    })
  }

  /**
   * Listens to events from the watcher process.
   *
   * @param   {change}          channel     The change channel
   * @param   {ChokidarEvents}  eventName   The event type
   * @param   {string}          eventPath   The triggering path
   */
  public on (channel: 'change', callback: (eventName: ChokidarEvents, eventPath: string) => void): any {
    this.process.on('all', (event: ChokidarEvents, p: string) => {
      this._logger.info(`[WATCHDOG] Emitting event: ${event}:${p}`)
      callback(event, p)
    })
  }

  /**
   * Shuts down the service provider.
   * @return {void} No return.
   */
  async shutdown (): Promise<void> {
    this.process.removeAllListeners()
    // We MUST under all circumstances properly call the close() function on
    // every chokidar process we utilize. Otherwise, the fsevents dylib will
    // still hold on to some memory after the Electron process itself shuts down
    // which will result in a crash report appearing on macOS.
    await this.process.close()
  }
}
