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

import { promises as fs } from 'fs'
import path from 'path'
import { app, ipcMain } from 'electron'
import ProviderContract from '../provider-contract'
import LogProvider from '../log'
import { Stats } from '@dts/main/stats-provider'

/**
 * ZettlrStats works like the ZettlrConfig object, only with a different file.
 * ZettlrStats monitors how the user uses Zettlr and should in the future be
 * able to present the user some nice looking statistics on his own behavior.
 * (In case anyone is worried: No, there will be no transmission of stats to
 * anyone.)
 */
export default class StatsProvider extends ProviderContract {
  private readonly statsPath: string
  private readonly statsFile: string
  private stats: Stats
  private hasBooted: boolean

  /**
   * Preset sane defaults and load an existing stats file if present
   * @param {Zettlr} parent The main zettlr object.
   */
  constructor (private readonly _logger: LogProvider) {
    super()
    this.statsPath = app.getPath('userData')
    this.statsFile = path.join(this.statsPath, 'stats.json')
    this.stats = {
      wordCount: {},
      pomodoros: {},
      avgMonth: 0,
      today: 0,
      sumMonth: 0
    }

    this.hasBooted = false

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
    await this.save()
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

    // Trigger a save. _recompute is being called from all the different setters
    // after anything changes. NOTE: Remember this for future stuff!
    await this.save()

    // Compute average
    let allwords = []
    for (let day in this.stats.wordCount) {
      // hasOwnProperty only returns "true" if the prop is not a default
      // prop that every object has.
      if (this.stats.wordCount.hasOwnProperty(day)) {
        allwords.push(this.stats.wordCount[day])
      }
    }

    allwords = allwords.reverse().slice(0, 30) // We only want the last 30 days.

    // Now summarize the last 30 days. Should never exceed 100k.
    this.stats.sumMonth = 0
    for (let i = 0; i < allwords.length; i++) {
      this.stats.sumMonth += allwords[i]
    }

    // Average last month
    this.stats.avgMonth = Math.round(this.stats.sumMonth / allwords.length)
    this.stats.today = this.stats.wordCount[this.today]
  }

  /**
   * Load a potentially existing stats file.
   */
  async boot (): Promise<void> {
    this._logger.verbose('Stats provider booting up')
    try {
      const data = await fs.readFile(this.statsFile, { encoding: 'utf8' })
      const parsedData = JSON.parse(data)
      // We cannot safe assign because the wordCount and pomodoros are
      // dictionaries, and it doesn't work for those (as the stats object
      // does not contain the properties of the saved state).
      this.stats = {
        wordCount: parsedData.wordCount,
        pomodoros: parsedData.pomodoros,
        avgMonth: parsedData.avgMonth,
        today: parsedData.today,
        sumMonth: parsedData.sumMonth
      }
      this.hasBooted = true
      await this._recompute()
    } catch (err) {
      // Write initial file
      this.hasBooted = true
      await this.save()
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

    this._recompute().catch(e => this._logger.error(`[Stats Provider] Error during recomputing: ${e.message as string}`, e))
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

    this._recompute().catch(e => this._logger.error(`[Stats Provider] Error during recomputing: ${e.message as string}`, e))
  }

  /**
   * Write the statistics (e.g. on app exit)
   */
  async save (): Promise<void> {
    // We have to explicitly check whether this provider has been booted,
    // because I've had the pleasure multiple times now that, if the boot()
    // method has not yet finished and the app is being shut down already (or
    // anything else triggers the save() method), that this will basically write
    // empty data into the file, thereby overwriting everything that has been
    // collected, which is especially bad regarding years of stats. I've lost
    // multiple months already because I couldn't explain this bug (today's the
    // first time after two years or so that I looked at this provider again).
    if (!this.hasBooted) {
      this._logger.warning('[Stats Provider] Cannot save stats to file: Booting not yet completed')
      return
    }

    // (Over-)write the configuration
    this._logger.info('[Stats Provider] Writing statistics to file')
    await fs.writeFile(this.statsFile, JSON.stringify(this.stats), { encoding: 'utf8' })
  }

  /**
   * Return the given date as a string in the form YYYY-MM-DD
   * @param {Date} [d = new Date()] The date which should be converted. Defaults to now.
   * @return {string} Today's date in international standard form.
   */
  get today (): string {
    const d = new Date()
    let yyyy = d.getFullYear()

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
