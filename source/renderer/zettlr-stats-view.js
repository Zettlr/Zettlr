/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrStatsView class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     This class displays information about the collected data,
 *                  such as average word count per day and today's word count.
 *
 * END HEADER
 */

const ZettlrPopup = require('./zettlr-popup.js');
const {trans} = require('../common/lang/i18n.js');
const {localiseNumber} = require('../common/zettlr-helpers.js');

class ZettlrStatsView
{
    constructor(parent)
    {
        this._renderer = parent;
        this._toolbarbutton = $('#toolbar .stats');
    }

    /**
     * Shows a popup using the given data
     * @param  {Object} data All data from main
     */
    show(data)
    {
        if(!data) {
            return;
        }
        // For now we only need the word count
        let wcount = data.wordCount;

        // Compute average
        let sum = 0;
        for(let day in wcount) {
            // hasOwnProperty only returns "true" if the prop is not a default
            // prop that every object has.
            if(wcount.hasOwnProperty(day)) {
                // TODO: As soon as the sum exceeds the Peta-amount (10^15),
                // we'll run into trouble because it's then close to
                // Number.MAX_SAFE_INTEGER. In this case only compute the last
                // week.
                sum += wcount[day];
            }
        }
        let avg = Math.round(sum / Object.keys(wcount).length);

        let today = new Date();
        let yyyy = today.getFullYear();
        let mm = today.getMonth() + 1;
        if(mm <= 9) mm =  '0' + mm;
        let dd = today.getDate();
        if(dd <= 9) dd = '0' + dd;

        today = yyyy + '-' + mm + '-' + dd;

        today = wcount[today] || 0;

        let cnt = `
        <table>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(sum)}</strong></td><td>${trans('gui.overall_words')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(avg)}</strong></td><td>${trans('gui.avg_words')}</td>
        </tr>
        <tr>
            <td style="text-align:right"><strong>${localiseNumber(today)}</strong></td><td>${trans('gui.today_words')}</td>
        </tr>
        </table>`;

        if(today > avg) {
            cnt += `<p><strong>${trans('gui.avg_surpassed')}</strong></p>`;
        } else if(today > avg-50) {
            cnt += `<p><strong>${trans('gui.avg_close_to')}</strong></p>`;
        } else {
            cnt += `<p><strong>${trans('gui.avg_not_reached')}</strong></p>`;
        }

        let popup = new ZettlrPopup(this, this._toolbarbutton, cnt);
    }
}

module.exports = ZettlrStatsView;
