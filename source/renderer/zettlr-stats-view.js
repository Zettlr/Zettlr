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
    if (!data) return

    // In case the user requests the big window.
    this._data = data

    let displaySum = (data.sumMonth > 99999) ? '>100k' : localiseNumber(data.sumMonth)

    let cnt = `
        <table>
        <tr>
            <td style="text-align:right"><strong>${displaySum}</strong></td><td>${trans('gui.words_last_month')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(data.avgMonth)}</strong></td><td>${trans('gui.avg_words')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(data.today)}</strong></td><td>${trans('gui.today_words')}</td>
        </tr>
        </table>`

    if (data.today > data.avgMonth) {
      cnt += `<p><strong>${trans('gui.avg_surpassed')}</strong></p>`
    } else if (data.today > data.avgMonth / 2) {
      cnt += `<p><strong>${trans('gui.avg_close_to')}</strong></p>`
    } else {
      cnt += `<p><strong>${trans('gui.avg_not_reached')}</strong></p>`
    }

    cnt += `<p><a class="button" id="more-stats">More &hellip;</a></p>`

    popup(this._toolbarbutton, cnt)
    $('#more-stats').on('click', (e) => {
      // Theres no form but the user has clicked the more button
      let dialog = new ZettlrDialog()
      dialog.init('statistics', this._data.wordCount)
      dialog.open()
    })
  }
}

module.exports = ZettlrStatsView
