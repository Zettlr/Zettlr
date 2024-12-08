/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        StatsProvider
 * CVM-Role:        Service Provider
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class controls some statistics that may be of interest
 *                  to the user.
 *
 * END HEADER
 */

import path from 'path'
import { app, ipcMain } from 'electron'
import ProviderContract from '../provider-contract'
import type LogProvider from '../log'
import PersistentDataContainer from '@common/modules/persistent-data-container'
import broadcastIPCMessage from '@common/util/broadcast-ipc-message'
import { today } from '@common/util/stats'

// This is the data exposed publicly
export interface Stats {
  wordCount: Record<string, number> // All words for the graph
  charCount: Record<string, number> // All characters for the graph
  pomodoros: Record<string, number> // All pomodoros ever completed
}

/**
 * ZettlrStats works like the ZettlrConfig object, only with a different file.
 * ZettlrStats monitors how the user uses Zettlr and should in the future be
 * able to present the user some nice looking statistics on his own behavior.
 * (In case anyone is worried: No, there will be no transmission of stats to
 * anyone.)
 */
export default class StatsProvider extends ProviderContract {
  private readonly statsFile: string
  private readonly container: PersistentDataContainer<Stats>
  private stats: Stats

  /**
   * Preset sane defaults and load an existing stats file if present
   * @param {Zettlr} parent The main zettlr object.
   */
  constructor (private readonly _logger: LogProvider) {
    super()
    this.statsFile = path.join(app.getPath('userData'), 'stats.json')
    this.container = new PersistentDataContainer<Stats>(this.statsFile, 'json')
    this.stats = {
      wordCount: {},
      charCount: {},
      pomodoros: {}
    }

    ipcMain.handle('stats-provider', (event, payload) => {
      const { command } = payload
      if (command === 'get-data') {
        return this.getData()
      }
    })
  }

  /**
   * Shuts down the provider
   */
  async shutdown (): Promise<void> {
    this._logger.verbose('Stats provider shutting down ...')
    this.container.shutdown()
  }

  /**
   * Returns the data object.
   * @return {Object} All statistical data.
   */
  getData (): Stats {
    return structuredClone(this.stats)
  }

  /**
   * Recomputes the statistical properties of the stats
   */
  _recompute (): void {
    const todayISO = today()
    // Make sure we have a today-count
    this.stats.wordCount[todayISO] = this.stats.wordCount[todayISO] ?? 0
    this.stats.charCount[todayISO] = this.stats.charCount[todayISO] ?? 0

    // Trigger a save. _recompute is being called from all the different setters
    // after anything changes. NOTE: Remember this for future stuff!
    this.container.set(this.stats)
    broadcastIPCMessage('stats-updated', this.stats)
  }

  /**
   * Load a potentially existing stats file.
   */
  async boot (): Promise<void> {
    this._logger.verbose('Stats provider booting up')

    if (!await this.container.isInitialized()) {
      // Stats container is not yet initialized
      await this.container.init(this.stats)
    } else {
      const parsedData = await this.container.get()
      // We cannot safeAssign here, as we store everything in records, which
      // would make the function throw the keys away.
      this.stats.wordCount = parsedData.wordCount ?? {}
      this.stats.charCount = parsedData.charCount ?? {}
      this.stats.pomodoros = parsedData.pomodoros ?? {}
      
      // Sanity check: We need all entries within date-count-properties in the
      // data container to conform to the format YYYY-MM-DD: count<number>
      const dateCounts: Array<keyof Stats> = [ 'wordCount', 'charCount', 'pomodoros' ]
      for (const prop of dateCounts) {
        for (const [ key, value ] of Object.entries(this.stats[prop])) {
          if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) {
            // eslint-disable-next-line @typescript-eslint/no-dynamic-delete
            delete this.stats[prop][key]
          } else if (typeof value !== 'number' || Number.isNaN(value)) {
            this.stats[prop][key] = 0
          }
        }
      }
    }

    this._recompute()
  }

  /**
   * Increase the word and character counters by the provided values
   *
   * @param  {number}  words  The number of words written since the last call to
   *                          this function
   * @param  {number}  chars  The number of characters written since the last
   *                          call to this function
   */
  updateCounts (words: number, chars: number): void {
    // Don't substract values
    words = Math.max(0, words)
    chars = Math.max(0, chars)
    const todayISO = today()

    if (!(todayISO in this.stats.wordCount)) {
      this.stats.wordCount[todayISO] = words
    } else {
      this.stats.wordCount[todayISO] += words
    }

    if (!(todayISO in this.stats.charCount)) {
      this.stats.charCount[todayISO] = chars
    } else {
      this.stats.charCount[todayISO] += chars
    }

    this._recompute()
  }

  /**
   * Increases the pomodoros by one
   * @return {ZettlrStats} This for chainability.
   */
  increasePomodoros (): void {
    const todayISO = today()
    if (!(todayISO in this.stats.pomodoros)) {
      this.stats.pomodoros[todayISO] = 1
    } else {
      this.stats.pomodoros[todayISO] += 1
    }

    this._recompute()
  }
}
