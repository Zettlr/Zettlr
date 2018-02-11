// Toolbar controller
const {trans} = require('../common/lang/i18n.js');

class ZettlrToolbar
{
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#toolbar');
        this.searchbar = this.div.find('.searchbar').first().find('input').first();
        this.searchbar.attr('placeholder', trans('gui.find_placeholder'));
        this.fileInfo = this.div.find('.file-info');

        this.activate();
    }

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

    hideWordCount()
    {
        this.fileInfo.text('');
    }

    toggleTheme()
    {
        this.div.toggleClass('dark');
    }

    focusSearch()
    {
        this.searchbar.focus();
        this.searchbar.select();
    }

    searchProgress(item, itemCnt)
    {
        // Colors (see variables.less): either green-selection or green-selection-dark
        let percent = item / itemCnt * 100;
        let color = this.div.hasClass('dark') ? 'rgba( 90, 170,  80, 1)' : 'rgba(200, 240, 170, 1)';
        let bgcol = this.div.css('background-color');
        this.searchbar.css('background-image', `linear-gradient(to right, ${color} 0%, ${color} ${percent}%, ${bgcol} ${percent}%, ${bgcol} 100%)`)
    }

    endSearch()
    {
        this.searchbar.css('background-image', 'none');
    }
}

module.exports = ZettlrToolbar;
