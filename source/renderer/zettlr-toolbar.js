/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrToolbar class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Handles the toolbar
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * ZettlrToolbar class
 */
class ZettlrToolbar
{
    /**
     * Initialize the toolbar handlers and activate
     * @param {ZettlrRenderer} parent The renderer object
     */
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#toolbar');
        this.searchbar = this.div.find('.searchbar').first().find('input').first();
        this.searchbar.attr('placeholder', trans('gui.find_placeholder'));
        this.fileInfo = this.div.find('.file-info');

        this.activate();
    }

    /**
     * Activate event listeners
     * @return {void} Nothing to return.
     */
    activate()
    {
        // Activate search function.
        this.searchbar.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                this.searchbar.blur();
                $('#preview').find('li').removeClass('hidden');
            } else if(e.which == 13) { // RETURN
                this.parent.beginSearch(this.searchbar.val().toLowerCase());
            }
        });

        this.searchbar.on('focus', function(e) {
            $(this).select();
        });

        // Activate buttons
        // -- so beautifully DRY <3
        let self = this;
        this.div.find('.button').on('click', function(e) {
            let elem = $(this);
            let command = elem.attr('data-command') || 'unknown-command';
            let content = elem.attr('data-content') || {};

            self.parent.handleEvent(null, {
                'command': command,
                'content': content
            });
        });
    }

    /**
     * Updates the word count in the info area
     * @param  {Integer} words Wordcount
     * @return {void}       Nothing to return
     */
    updateWordCount(words)
    {
        if(words === 0) {
            return this.hideWordCount();
        }

        // Format the number nicely
        let wd = '';
        if(words < 1000) {
            wd = words;
        } else if(words >= 1000) {
            wd = words.toString();
            let cnt = 0;
            for(let i = wd.length-1; i > 0; i--) {
                cnt++;
                if(cnt === 3) {
                    wd = wd.substr(0, i) + '.' + wd.substr(i);
                    cnt = 0;
                }
            }
        }

        this.fileInfo.text(trans('gui.words', wd));
    }

    /**
     * Hides the word count
     * @return {ZettlrToolbar} Chainability.
     */
    hideWordCount()
    {
        this.fileInfo.text('');
        return this;
    }

    /**
     * Toggles the theme on the toolbar
     * @return {ZettlrToolbar} Chainability.
     */
    toggleTheme()
    {
        this.div.toggleClass('dark');
        return this;
    }

    /**
     * Focuses the search area
     * @return {ZettlrToolbar} Chainability.
     */
    focusSearch()
    {
        this.searchbar.focus();
        this.searchbar.select();
        return this;
    }

    /**
     * Progresses the search indicator
     * @param  {Integer} item    Current items that have been searched
     * @param  {Integer} itemCnt Overall amount of items to be searched
     * @return {void}         Nothing to return.
     */
    searchProgress(item, itemCnt)
    {
        // Colors (see variables.less): either green-selection or green-selection-dark
        let percent = item / itemCnt * 100;
        let color = this.div.hasClass('dark') ? 'rgba( 90, 170,  80, 1)' : 'rgba(200, 240, 170, 1)';
        let bgcol = this.div.css('background-color');
        this.searchbar.css('background-image', `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, ${bgcol} ${percent}%, ${bgcol} 100%)`)
    }

    /**
     * Ends the search by resetting the indicator
     * @return {void} Nothing to return.
     */
    endSearch()
    {
        this.searchbar.css('background-image', 'none');
    }
}

module.exports = ZettlrToolbar;
