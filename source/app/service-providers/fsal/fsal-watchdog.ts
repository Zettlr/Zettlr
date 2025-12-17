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

import { FSWatcher, type ChokidarOptions } from 'chokidar'

import type LogProvider from '@providers/log'
import type ConfigProvider from '@providers/config'
import path from 'path'
import type { EventName } from 'chokidar/handler'
import { WATCHDOG_IGNORE_RE } from '@common/util/ignore-path'

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
  constructor (logger: LogProvider, config: ConfigProvider) {
    this._logger = logger
    this._config = config

    const options: ChokidarOptions = {
      ignored: WATCHDOG_IGNORE_RE,
      persistent: true,
      ignoreInitial: true, // Do not track the initial watch as changes
      followSymlinks: false, // Zettlr does not support symlinks
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

    this.process = new FSWatcher(options)
  }

  /**
   * Listens to events from the watcher process.
   *
   * @param   {change}    channel  The change channel
   * @param   {Function}  report   A reporter that gets called with eventName and eventPath
   */
  public on (channel: 'change', report: (eventName: EventName, eventPath: string) => void): any {
    this.process.on('all', (event, p: string) => {
      const basename = path.basename(p)
      const dirname = path.dirname(p)

      // Specials: .ztr-directory
      if (basename === '.ztr-directory') {
        // Even on add or unlink, it's strictly speaking a change for the dir
        this._logger.info(`[WATCHDOG] Emitting event (.ztr-directory): change:${dirname}`)
        report('change', dirname)
      }

      this._logger.info(`[WATCHDOG] Emitting event: ${event}:${p}`)
      report(event, p)
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

  /**
   * Add one or more additional paths to watch
   *
   * @param  {string|readonly string[]}  paths  One or more paths to watch
   */
  public watchPath (paths: string | string[]): void {
    this._logger.verbose(`Starting to watch path(s) ${String(paths)}`)
    this.process.add(paths)
  }

  /**
   * Remove one or more paths from the watcher
   *
   * @param  {string|readonly string[]}  paths  One or more paths to unwatch
   */
  public unwatchPath (paths: string | string[]): void {
    this.process.unwatch(paths)
  }

  /**
   * Return all currently watched paths; the return value maps diretories to
   * filenames.
   *
   * @return  {Record<string, string[]>}  The watched paths
   */
  public getWatched (): Record<string, string[]> {
    return this.process.getWatched()
  }
}
