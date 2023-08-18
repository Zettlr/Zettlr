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

export interface Stats {
  wordCount: Record<string, number> // All words for the graph
  pomodoros: Record<string, number> // All pomodoros ever completed
  avgMonth: number // Monthly average
  today: number // Today's word count
  sumMonth: number // Overall sum for the past month
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
  private readonly container: PersistentDataContainer
  private stats: Stats

  /**
   * Preset sane defaults and load an existing stats file if present
   * @param {Zettlr} parent The main zettlr object.
   */
  constructor (private readonly _logger: LogProvider) {
    super()
    this.statsFile = path.join(app.getPath('userData'), 'stats.json')
    this.container = new PersistentDataContainer(this.statsFile, 'json')
    this.stats = {
      wordCount: {},
      pomodoros: {},
      avgMonth: 0,
      today: 0,
      sumMonth: 0
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
    return {
      wordCount: Object.assign({}, this.stats.wordCount),
      pomodoros: Object.assign({}, this.stats.pomodoros),
      avgMonth: this.stats.avgMonth,
      today: this.stats.today,
      sumMonth: this.stats.sumMonth
    }
  }

  /**
   * Recomputes the statistical properties of the stats
   */
  async _recompute (): Promise<void> {
    // Make sure we have a today-count
    if (this.stats.wordCount[this.today] === undefined) {
      this.stats.wordCount[this.today] = 0
    }

    // Compute average
    let allwords = Object.values(this.stats.wordCount)
    allwords = allwords.reverse().slice(0, 30) // We only want the last 30 days.

    // Now summarize the last 30 days. Should never exceed 100k.
    this.stats.sumMonth = 0
    for (let i = 0; i < allwords.length; i++) {
      this.stats.sumMonth += allwords[i]
    }

    // Average last month
    this.stats.avgMonth = Math.round(this.stats.sumMonth / (allwords.length ?? 0))
    this.stats.today = this.stats.wordCount[this.today]

    // Trigger a save. _recompute is being called from all the different setters
    // after anything changes. NOTE: Remember this for future stuff!
    this.container.set(this.stats)
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
      // Sanity check: We need all numbers everywhere
      let errorsEncountered = false
      for (const key in parsedData.wordCount) {
        if (typeof parsedData.wordCount[key] !== 'number' || Number.isNaN(parsedData.wordCount[key])) {
          parsedData.wordCount[key] = 0
          errorsEncountered = true
        }
      }

      this.stats = {
        wordCount: parsedData.wordCount,
        pomodoros: parsedData.pomodoros,
        avgMonth: parsedData.avgMonth,
        today: parsedData.today,
        sumMonth: parsedData.sumMonth
      }

      if (errorsEncountered) {
        await this._recompute()
      }
    }
  }

  /**
   * Increase the word count by val
   * @param  {Integer} val The amount of words written since the last call of this function.
   * @return {ZettlrStats}     This for chainability.
   */
  updateWordCount (val: number): void {
    // Don't substract words
    if (val < 0) {
      val = 0
    }

    // For now we only need a word count
    if (!this.stats.wordCount.hasOwnProperty(this.today)) {
      this.stats.wordCount[this.today] = val
    } else {
      this.stats.wordCount[this.today] = this.stats.wordCount[this.today] + val
    }

    this._recompute()
      .catch(e => this._logger.error(`[Stats Provider] Error during recomputing: ${e.message as string}`, e))
  }

  /**
   * Increases the pomodoros by one
   * @return {ZettlrStats} This for chainability.
   */
  increasePomodoros (): void {
    if (!this.stats.pomodoros.hasOwnProperty(this.today)) {
      this.stats.pomodoros[this.today] = 1
    } else {
      this.stats.pomodoros[this.today] = this.stats.pomodoros[this.today] + 1
    }

    this._recompute()
      .catch(e => this._logger.error(`[Stats Provider] Error during recomputing: ${e.message as string}`, e))
  }

  /**
   * Return the given date as a string in the form YYYY-MM-DD
   *
   * @return  {string}  Today's date in international standard form.
   */
  get today (): string {
    const d = new Date()
    const yyyy = d.getFullYear()

    let mm: number|string = d.getMonth() + 1
    if (mm <= 9) {
      mm = '0' + mm.toString()
    }

    let dd: number|string = d.getDate()
    if (dd <= 9) {
      dd = '0' + dd.toString()
    }

    return `${yyyy}-${mm}-${dd}`
  }
}
