/* global $ */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrStatsView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This class displays information about the collected data,
 *                  such as average word count per day and today's word count.
 *
 * END HEADER
 */

const popup = require('./zettlr-popup.js')
const ZettlrDialog = require('./zettlr-dialog.js')
const { trans } = require('../common/lang/i18n.js')
const { localiseNumber } = require('../common/zettlr-helpers.js')

/**
 * Simply controls the small popup containing the stats.
 */
class ZettlrStatsView {
  /**
    * Creates the instance
    * @param {ZettlrRenderer} parent The renderer.
    */
  constructor (parent) {
    this._renderer = parent
    this._toolbarbutton = $('#toolbar .stats')
    this._data = null
  }

  /**
    * Shows a popup using the given data
    * @param  {Object} data All data from main
    */
  show (data) {
    if (!data) {
      return
    }

    // In case the user requests the big window.
    this._data = data

    // For now we only need the word count
    let wcount = data.wordCount

    // Compute average
    let allwords = []
    for (let day in wcount) {
      // hasOwnProperty only returns "true" if the prop is not a default
      // prop that every object has.
      if (wcount.hasOwnProperty(day)) {
        allwords.push(wcount[day])
      }
    }
    allwords.reverse() // We only want the last 30 days.

    // Now summarize the last 30 days. Should never exceed 100k.
    let sum = 0
    let end = (allwords.length > 29) ? 30 : allwords.length // Necessary for fresh users that haven't used Zettlr 30 days.
    for (let i = 0; i < end; i++) {
      sum += allwords[i]
    }

    let avg = Math.round(sum / end) // Average last month

    let today = new Date()
    let yyyy = today.getFullYear()
    let mm = today.getMonth() + 1
    if (mm <= 9) mm = '0' + mm
    let dd = today.getDate()
    if (dd <= 9) dd = '0' + dd

    today = yyyy + '-' + mm + '-' + dd

    today = wcount[today] || 0

    if (sum > 99999) {
      // Would look stupid in display ->
      sum = '>100k'
    } else {
      sum = localiseNumber(sum)
    }

    let cnt = `
        <table>
        <tr>
            <td style="text-align:right"><strong>${sum}</strong></td><td>${trans('gui.words_last_month')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(avg)}</strong></td><td>${trans('gui.avg_words')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(today)}</strong></td><td>${trans('gui.today_words')}</td>
        </tr>
        </table>`

    if (today > avg) {
      cnt += `<p><strong>${trans('gui.avg_surpassed')}</strong></p>`
    } else if (today > avg / 2) {
      cnt += `<p><strong>${trans('gui.avg_close_to')}</strong></p>`
    } else {
      cnt += `<p><strong>${trans('gui.avg_not_reached')}</strong></p>`
    }

    cnt += `<p><form><button type="submit">More &hellip;</button></form></p>`

    popup(this._toolbarbutton, cnt, (form) => {
      // Theres no form but the user has clicked the more button
      let dialog = new ZettlrDialog()
      dialog.init('statistics', this._data.wordCount)
      dialog.open()
    })
  }
}

module.exports = ZettlrStatsView
