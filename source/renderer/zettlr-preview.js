/* THIS CLASS CONTROLS THE FILE PREVIEW LIST */

function ZettlrPreview(parent)
{
    this.parent = parent;
    this.div = null;
    this.searchBarElem = null;
    this.counter = null;
    this.snippets = true;

    // Search related
    this.hashes = null;
    this.currentSearch = null;
    this.currentSearchIndex = 0;

    this.init = function() {
        // Get our div that this class controls.
        this.div = $('#preview');

        this.counter = $('<div id="counter"><span class="progress"></span></div>');

        this.div.resizable({
            alsoResize: ['#directories', '#editor'],
            handles: 'e, w', // Only move east and west (left/right)
            minWidth: 150
        });

        this.searchBarElem = $(`<div id="search-directory">
        <input type="text" placeholder="Find &hellip;">
        </div>`);
        this.searchBarElem.append(this.counter);

        // Enable clicks etc.
        this.activate();
    };

    this.newFileList = function(files) {
        if(files == null) {
            // Somehow the file array was empty
            return;
        }

        // Clear preview list
        this.div.html('<ul></ul>');

        // Put the files into the list
        this.addFiles(files);

        // Don't forget to reactivate the lis to react on mouse clicks
        this.activate();
    };

    this.addFiles = function(files) {
        // Sometimes, there are nulls in the directory list.
        if(files == null) {
            return;
        }

        if(files.type == "file") {
            this.div.find('ul').first().append(this.getLi(files));
        } else if(files.type == "directory") {
            // Append directory (for easier overview)
            this.div.find('ul').first().append(this.dirLi(files));
            if(files.children != null) {
                for(let c of files.children) {
                    this.addFiles(c);
                }
            }
        }
    };

    // Activate clicks on the lis
    this.activate = function() {
        // First: Enable clicks
        let that = this;
        this.div.find('li').on('click', function() {
            if($(this).hasClass('directory')) {
                return;
            }
            that.parent.requestFile($(this).attr('data-hash'));
            // We need to focus the div again because as the lis are draggable
            // they will retain focus.
            that.div.focus();
        });

        // Second: Select a file
        if(this.parent.getCurrentFile() != null) {
            // Try to find the file (elem == null if not in list)
            this.select(this.parent.getCurrentFile().hash);
        }

        // Third: Enable arrow key navigation in list
        this.div.on('keydown', (e) => {
            curLi = this.div.find('li.selected').first();
            // 38 is up, 40 is down
            if(e.which == 38) {
                e.preventDefault();
                if(e.metaKey || e.ctrlKey) {
                    first = curLi.prevAll().not('.directory, .hidden').last();
                    first.click();
                    this.scrollIntoView(first);
                } else {
                    prev = curLi.prevAll().not('.directory, .hidden').first();
                    prev.click();
                    this.scrollIntoView(prev);
                }
            } else if(e.which == 40) {
                e.preventDefault();
                if(e.metaKey || e.ctrlKey) {
                    last = curLi.nextAll().not('.directory, .hidden').last();
                    last.click();
                    this.scrollIntoView(last);
                } else {
                    next = curLi.nextAll().not('.directory, .hidden').first();
                    next.click();
                    this.scrollIntoView(next);
                }
            }
        });

        // Also make draggable
        this.div.find('li').draggable({
            'cursorAt': { 'top': 0, 'left': 0},
            'scroll': false,
            'helper': function() {
                // Return a clone attached to the body (movable through the whole view)
                // and that has the same CSS classes
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
            'distance': 5,
        });
    };

    // Select a file if possible
    this.select = function(hash) {
        elem = this.div.find('li[data-hash="'+hash+'"]');
        if(elem != null) {
            this.div.find('li').removeClass('selected');
            elem.addClass('selected');

            // Scroll into view if necessary
            this.scrollIntoView(elem);
        }
    };

    this.toggleTheme = function() {
        this.div.toggleClass('dark');
    };

    // Toggle display of snippets
    this.toggleSnippets = function() {
        this.snippets = !this.snippets;
        this.div.find('span.snippet').toggleClass('hidden');

        // If necessary, scroll the selection into view
        elem = this.div.find('li.selected');

        if(elem.length > 0) {
            this.scrollIntoView(elem);
        }
    };

    this.getLi = function(file) {
        snip = '';

        if(!this.snippets) {
            snip = ' hidden';
        }

        return `<li data-hash="${file.hash}">
        <strong>${file.name.substr(0, file.name.length-3)}
        </strong><br>
        <span class="snippet${snip}">${file.snippet}</span>
        </li>`;
    };

    this.dirLi = function(dir) {
        return `<li class="directory" title="${dir.name}">${dir.name}</li>`;
    };

    // Display the search bar.
    this.searchBar = function() {
        if(this.div.find('#search-directory').length > 0) {
            this.searchBarElem.detach();
            this.endSearch();
            this.div.find('li').removeClass('hidden');

            elem = this.div.find('li.selected');
            this.scrollIntoView(elem); // Just in case.
        } else {
            this.div.prepend(this.searchBarElem);
            input = this.searchBarElem.find('input').first();
            input.focus();
            input.select();

            // Activate search function.
            let that = this;
            input.on('keyup', (e) => {
                if(e.which == 27) { // ESC
                    that.searchBar();
                } else if(e.which == 13) { // RETURN
                    // that.requestSearch(that.searchBarElem.find('input').val().toLowerCase());
                    that.beginSearch(that.searchBarElem.find('input').val().toLowerCase());
                }
            });
        }
    };

    this.beginSearch = function(term) {
        // First sanitize the terms
        let myTerms = [];
        let curWord = "";
        let hasExact = false;
        let operator = 'AND';

        for(let i = 0; i < term.length; i++) {
            c = term.charAt(i);
            if((c === " ") && !hasExact) {
                // Eat word and next
                if(curWord.trim() !== '') {
                    myTerms.push({ "word": curWord.trim(), "operator": operator });
                    curWord = '';
                    if(operator == 'OR') {
                        operator = 'AND';
                    }
                }
                continue;
            } else if(c === "|") {
                // We got an OR operator
                // So change the last word's operator and set current operator to OR
                operator = 'OR';
                // Take a look forward and if the next char is also a space, eat it right now
                if(term.charAt(i+1) === ' ') {
                    ++i;
                }
                // Also the previous operator should also be set to or
                myTerms[myTerms.length - 1].operator = 'OR';
                continue;
            } else if(c === '"') {
                if(!hasExact) {
                    hasExact = true;
                } else {
                    hasExact = false;
                    myTerms.push({ "word": curWord.trim(), "operator": operator });
                    curWord = '';
                    if(operator == 'OR') {
                        operator = 'AND';
                    }
                    continue;
                }
                // Don't eat the quote;
            }

            curWord += term.charAt(i);
        }

        // Afterwards eat the last word if its not empty
        if(curWord.trim() !== '') {
            myTerms.push({ "word": curWord.trim(), "operator": operator });
        }

        // Now pack together all consecutive ORs to make it easier for the search
        // in the main process
        let currentOr = {};
        currentOr.operator = 'OR';
        currentOr.word = [];
        let newTerms = [];

        for(let i = 0; i < myTerms.length; i++) {
            if(myTerms[i].operator === 'AND') {
                if(currentOr.word.length > 0) {
                    // Duplicate object so that the words are retained
                    newTerms.push(JSON.parse(JSON.stringify(currentOr)));
                    currentOr.word = [];
                }
                newTerms.push(myTerms[i]);
            } else if(myTerms[i].operator === 'OR') {
                currentOr.word.push(myTerms[i].word);
            }
        }

        // Now push the currentOr if not empty
        if(currentOr.word.length > 0) {
            newTerms.push(JSON.parse(JSON.stringify(currentOr)));
        }

        // Now we are all set and can begin the journey. First we need to prepare
        // some things. First: Write the current terms into this object
        // second, listen for search events and third clear everything up when
        // we are done.

        let that = this;
        this.hashes = [];
        this.div.find('li').each(function() {
            if(!$(this).hasClass('directory')) {
                $(this).addClass('hidden');
                that.hashes.push($(this).attr('data-hash'));
            }
        });
        this.currentSearch = newTerms;
        this.currentSearchIndex = 0;

        // Aaaaand: Go!
        this.counter.addClass('show');
        this.doSearch();
    };

    this.doSearch = function() {
        if(this.hashes.length == 0) {
            this.endSearch();
            return;
        }

        // We got an array to search through.
        if(this.currentSearchIndex == (this.hashes.length-1)) {
            // End search
            this.endSearch();
            return;
        }
        if(this.currentSearchIndex > this.hashes.length) {
            this.endSearch();
            return;
        }

        this.currentSearchIndex++;

        this.counter.find('.progress').css('width', (this.currentSearchIndex / this.hashes.length * 100) + '%')

        // Send a request to the main process and handle it afterwards.
        this.parent.ipc.send('search-file', {
            'hash': this.hashes[this.currentSearchIndex],
            'terms': this.currentSearch
        });
    };

    this.handleSearchResult = function(res) {
        if(res.result) {
            this.div.find('li[data-hash="' + res.hash + '"]').removeClass('hidden');
        }

        // Next search cycle
        this.doSearch();
    };

    this.endSearch = function() {
        this.counter.removeClass('show');
        this.currentSearchIndex = 0;
        this.hashes = [];
        this.currentSearch = null;
    };

    // END SEARCH

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

module.exports = ZettlrPreview;
