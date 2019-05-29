/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrStats class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class controls some statistics that may be of interest
 *                  to the user. Currently, this only includes the word count.
 *
 * END HEADER
 */

const fs = require('fs')
const path = require('path')
const { app } = require('electron')

/**
 * ZettlrStats works like the ZettlrConfig object, only with a different file.
 * ZettlrStats monitors how the user uses Zettlr and should in the future be
 * able to present the user some nice looking statistics on his own behavior.
 * (In case anyone is worried: No, there will be no transmission of stats to
 * anyone.)
 */
class ZettlrStats {
  /**
   * Preset sane defaults and load an existing stats file if present
   * @param {Zettlr} parent The main zettlr object.
   */
  constructor (parent) {
    this.parent = parent
    this.statsPath = app.getPath('userData')
    this.statsFile = path.join(this.statsPath, 'stats.json')
    this.stats = null

    this.statstpl = {
      'wordCount': {},
      'pomodoros': {}
    }

    this.load()
  }

  /**
   * Returns the data object.
   * @return {Object} All statistical data.
   */
  getData () {
    return JSON.parse(JSON.stringify(this.stats))
  }

  /**
   * Returns an object containing all calculated stats.
   * @return {Object} An object exposing the statistical parameters.
   */
  getStats () {
    let ret = {
      'wordCount': this.getData().wordCount, // All words for the graph
      'pomodoros': this.getData().pomodoros, // All pomodoros ever completed
      'avgMonth': 0, // Monthly average
      'today': 0, // Today's word count
      'sumMonth': 0 // Overall sum for the past month
    }

    // Compute average
    let allwords = []
    for (let day in ret.wordCount) {
      // hasOwnProperty only returns "true" if the prop is not a default
      // prop that every object has.
      if (ret.wordCount.hasOwnProperty(day)) allwords.push(ret.wordCount[day])
    }
    allwords = allwords.reverse().slice(0, 30) // We only want the last 30 days.

    // Now summarize the last 30 days. Should never exceed 100k.
    for (let i = 0; i < allwords.length; i++) ret.sumMonth += allwords[i]

    // Average last month
    ret.avgMonth = Math.round(ret.sumMonth / allwords.length)
    ret.today = ret.wordCount[this.getDate()] || 0

    return ret
  }

  /**
   * Load a potentially existing stats file.
   * @return {ZettlrStats} This for chainability.
   */
  load () {
    this.stats = this.statstpl

    // Check if dir exists. If not, create.
    try {
      fs.lstatSync(this.statsPath)
    } catch (e) {
      fs.mkdirSync(this.statsPath)
    }

    // Does the file already exist?
    try {
      fs.lstatSync(this.statsFile)
      this.stats = JSON.parse(fs.readFileSync(this.statsFile, { encoding: 'utf8' }))
    } catch (e) {
      fs.writeFileSync(this.statsFile, JSON.stringify(this.statstpl), { encoding: 'utf8' })
      return this
    }

    return this
  }

  /**
   * Increase the word count by val
   * @param  {Integer} val The amount of words written since the last call of this function.
   * @return {ZettlrStats}     This for chainability.
   */
  updateWordCount (val) {
    if (!this.stats.hasOwnProperty('wordCount')) {
      this.stats['wordCount'] = {}
    }

    // Don't substract words
    if (val < 0) val = 0

    // For now we only need a word count
    if (!this.stats.wordCount.hasOwnProperty(this.getDate())) {
      this.stats.wordCount[this.getDate()] = val
    } else {
      this.stats.wordCount[this.getDate()] = this.stats.wordCount[this.getDate()] + val
    }

    return this
  }

  /**
   * Increases the pomodoros by one
   * @return {ZettlrStats} This for chainability.
   */
  increasePomodoros () {
    if (!this.stats.hasOwnProperty('pomodoros')) {
      this.stats['pomodoros'] = {}
    }

    if (!this.stats.pomodoros.hasOwnProperty(this.getDate())) {
      this.stats.pomodoros[this.getDate()] = 1
    } else {
      this.stats.pomodoros[this.getDate()] = this.stats.pomodoros[this.getDate()] + 1
    }

    return this
  }

  /**
   * Write the statistics (e.g. on app exit)
   * @return {ZettlrStats} This for chainability.
   */
  save () {
    if (this.statsFile == null || this.stats == null) {
      this.load()
    }
    // (Over-)write the configuration
    fs.writeFileSync(this.statsFile, JSON.stringify(this.stats), { encoding: 'utf8' })

    return this
  }

  /**
   * Return the given date as a string in the form YYYY-MM-DD
   * @param {Date} [d = new Date()] The date which should be converted. Defaults to now.
   * @return {String} Today's date in international standard form.
   */
  getDate (d = new Date()) {
    let yyyy = d.getFullYear()
    let mm = d.getMonth() + 1
    if (mm <= 9) mm = '0' + mm
    let dd = d.getDate()
    if (dd <= 9) dd = '0' + dd

    return yyyy + '-' + mm + '-' + dd
  }
}

module.exports = ZettlrStats
