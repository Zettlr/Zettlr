/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrToolbar class
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Handles the toolbar
 *
 * END HEADER
 */

const {trans} = require('../common/lang/i18n.js');

/**
 * This class is responsible for rendering the Toolbar. It builds the toolbar
 * based on the toolbar.json file in the assets directory. Therefore one can
 * think of hooks to implement buttons dynamically in the future (e.g., for
 * plugins).
 */
class ZettlrToolbar
{
    /**
     * Initialize the toolbar handlers and activate
     * @param {ZettlrRenderer} parent The renderer object
     */
    constructor(parent)
    {
        this._renderer = parent;
        this._div = $('#toolbar');
        this._build();
        this._searchbar = this._div.find('.searchbar').first().find('input').first();
        this._searchbar.attr('placeholder', trans('gui.find_placeholder'));
        this._fileInfo = this._div.find('.file-info');

        this._act();
    }

    /**
     * Activate event listeners
     * @return {void} Nothing to return.
     */
    _act()
    {
        // Activate search function.
        this._searchbar.on('keyup', (e) => {
            if(e.which == 27) { // ESC
                this._searchbar.blur();
                this._renderer.getPreview().showFiles();
            } else if(e.which == 13) { // RETURN
                this._renderer.beginSearch(this._searchbar.val().toLowerCase());
            }
        });

        this._div.find('.end-search').on('click', (e) => {
            this._renderer.getPreview().showFiles();
        })

        this._searchbar.on('focus', function(e) {
            $(this).select();
        });

        // Activate buttons
        // -- so beautifully DRY <3
        this._div.find('.button').on('click', (e) => {
            let elem = $(e.currentTarget);
            let command = elem.attr('data-command') || 'unknown-command';
            let content = elem.attr('data-content') || {};

            this._renderer.handleEvent(command, content);
        });
    }

    /**
     * This builds the toolbar
     * @return {void} No return.
     */
    _build()
    {
        let tpl = require('./assets/toolbar/toolbar.json').toolbar;

        // Append everything to the div.
        for(let elem of tpl) {
            let child = $('<div>').addClass(elem.role);
            if(elem.role === 'button') {
                child.addClass(elem.class);
                child.attr('data-command', elem.command);
                child.attr('data-content', elem.content);
                child.attr('title', trans(elem.title));
            } else if(elem.role === 'searchbar') {
                child.html('<input type="text"><div class="end-search">&times;</div>');
            } else if(elem.role === 'file-info') {
            } else if(elem.role === 'pomodoro') {
                child.addClass('button');
                child.attr('data-command', 'pomodoro');
                child.html('<svg width="16" height="16" viewBox="0 0 20 20"><circle class="pomodoro-meter" cx="10" cy="10" r="7" stroke-width="6" /> <circle class="pomodoro-value" cx="10" cy="10" r="7" stroke-width="6" /></svg>');
            }
            this._div.append(child);
        }
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

        this._fileInfo.text(trans('gui.words', wd));
    }

    /**
     * Hides the word count
     * @return {ZettlrToolbar} Chainability.
     */
    hideWordCount()
    {
        this._fileInfo.text('');
        return this;
    }

    /**
     * Toggles the theme on the toolbar
     * @return {ZettlrToolbar} Chainability.
     */
    toggleTheme()
    {
        this._div.toggleClass('dark');
        return this;
    }

    /**
     * Focuses the search area
     * @return {ZettlrToolbar} Chainability.
     */
    focusSearch()
    {
        this._searchbar.focus();
        this._searchbar.select();
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
        let color = this._div.hasClass('dark') ? 'rgba( 90, 170,  80, 1)' : 'rgba(200, 240, 170, 1)';
        let bgcol = this._div.css('background-color');
        this._searchbar.css('background-image', `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, ${bgcol} ${percent}%, ${bgcol} 100%)`)
    }

    /**
     * Ends the search by resetting the indicator
     * @return {void} Nothing to return.
     */
    endSearch()
    {
        this._searchbar.css('background-image', 'none');
    }
}

module.exports = ZettlrToolbar;
