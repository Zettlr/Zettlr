/* THIS CLASS CONTROLS THE DIRECTORIES-DIV */

function ZettlrDirectories(parent)
{
    this.parent = parent;
    this.div = null;

    this.init = function() {
        this.div = $('#directories');
        this.activate();
    };

    this.activate = function() {
        let that = this;
        // Enable click events on the directory pane
        this.div.find('li').on('click', function() {
            // Request the selection of a new directory
            that.parent.requestDir($(this).attr('data-hash'));
        });

        // Also make draggable
        this.div.find('li:not(#root)').draggable({
            //'containment': this.div,
            'cursorAt': { 'top': 0, 'left': 0},
            'scroll': false,
            'helper': function() {
                return $(this)
                .clone()
                .appendTo('body')
                .css('z-index', 1000)
                .css('height', $(this).innerHeight())
                .css('width', $(this).innerWidth())
                .css('background-color', $(this).css('background-color'))
                .css('color', $(this).css('color'))
                .css('font-family', $(this).css('font-family'))
                .css('padding', $(this).css('padding'))
                .css('margin', $(this).css('margin'))
                .css('list-style-type', $(this).css('list-style-type'));
            },
            'revert': "invalid", // Only revert if target was invalid
            'revertDuration': 200,
            'distance': 5
        });

        // Also make droppable :D
        this.div.find('li').droppable({
            'accept': 'li',
            'tolerance': 'pointer', // The pointer must be over the droppable
            'drop': function(e, ui) {
                $(this).removeClass('highlight');
                // requestMove: From, to
                that.parent.requestMove(ui.draggable.attr('data-hash'), $(this).attr('data-hash'));
            },
            'over': function(e, ui) {
                $(this).addClass('highlight');
            },
            'out': function(e, ui) {
                $(this).removeClass('highlight');
            }
        });

        // Second, we need to enable expanding/collapsing directories by clicking on this indicator
        this.div.find('.collapse-indicator').on('click', function(e) {
            // Prevent to "bubble" event to parent, because this would "click"
            // it, retrieving another dir
            e.stopPropagation();
            // Only "collapse" ULs on second level (never collapse root dir)
            if($(this).parent().parent().has('ul').length > 0) {
                $(this).parent().parent().toggleClass('collapsed');
            }
        });
    };

    // Render a new directory list.
    this.newDirectoryList = function(files) {
        // Somehow the list was empty
        if(files == null) {
            return;
        }

        // Empty
        this.div.html('');

        // Recursively add new dirs.
        this.addDirs(files, this.div, 0);

        // Now add collapsible-indicators.
        this.div.find('ul li:first-child').each(function() {
            if($(this).parent().has('ul').length > 0) {
                // We got directories inside this, so indicate
                $(this).html('<span class="collapse-indicator"></span> ' + $(this).html());
            }
        });

        // Activate the event listeners again.
        this.activate();
    };

    // Draw directories into the pane.
    this.addDirs = function(files, ulToAppend, sublevel) {
        if(files == null) {
            return;
        }

        // Skip files.
        if(files.type == "directory") {
            // Collapse all lists except top level
            if(sublevel == 1) collClass = 'class="collapsed"';
            if(sublevel == 0) collClass = '';
            if(sublevel == 0) liClass = 'id="root"';
            if(sublevel == 1) liClass = '';

            let newul = $(`<ul style="padding-left: ${sublevel}em;" ${collClass}></ul>`);
            ulToAppend.append(newul);

            newul.append(`<li ${liClass} data-hash="${files.hash}" title="${files.name}">${files.name}</li>`)

            if(files.children !== null) {
                for(let c of files.children) {
                    this.addDirs(c, newul, 1);
                }
            }
        }
    };

    this.toggleTheme = function() {
        this.div.toggleClass('dark');
    };

    // Select another directory
    this.select = function(hash) {
        this.div.find('li').removeClass('selected');
        elem = this.div.find('li[data-hash="'+hash+'"]').first();
        elem.addClass('selected');
        this.uncollapse(elem); // Uncollapse directory tree leading to this elem.
        this.scrollIntoView(elem);
    };

    this.uncollapse = function(elem) {
        // Remove collapsed-classes until the parent is a <div>
        while(!elem.parent().is('div')) {
            elem = elem.parent();
            elem.removeClass('collapsed');
        }
    };

    this.scrollIntoView = function(elem) {
        // Do we have an element to scroll?
        if(!elem.length) {
            return;
        }

        // Somehow it is impossible to write position().top into a variable.
        // Workaround: Short name for position and then use as pos.top ...
        pos = elem.position();
        bot = pos.top + elem.outerHeight();
        docHeight = this.div.height();
        curScroll = this.div.scrollTop();
        // Top:
        if(pos.top < 0) {
            this.div.scrollTop(curScroll + pos.top);
        }
        // Down:
        if(bot > docHeight) {
            this.div.scrollTop(curScroll + bot - docHeight);
        }
    };
}

module.exports = ZettlrDirectories;
