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

        today = wcount[today];

        let cnt = '<p>' + trans('gui.overall_words', localiseNumber(sum)) + '</p>';
        cnt += '<p>' + trans('gui.avg_words', localiseNumber(avg)) + '</p>';
        cnt += '<p>' + trans('gui.today_words', localiseNumber(today)) + '</p>';

        let popup = new ZettlrPopup(this, this._toolbarbutton, cnt);
    }
}

module.exports = ZettlrStatsView;
