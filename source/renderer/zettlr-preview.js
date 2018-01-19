/* THIS CLASS CONTROLS THE FILE PREVIEW LIST */

class ZettlrPreview
{
    constructor(parent)
    {
        this.parent             = parent;
        this.snippets           = true;

        // Elements
        this.div                = $('#preview');

        // Search related
        this.hashes             = null;
        this.currentSearch      = null;
        this.currentSearchIndex = 0;
    }

    newFileList(files)
    {
        if(files == null) {
            // Somehow the file array was empty
            return;
        }

        this.div.scrollTop(0);

        // Clear preview list
        this.div.html('<ul></ul>');

        // Put the files into the list
        this.addFiles(files);

        // Don't forget to reactivate the lis to react on mouse clicks
        this.activate();
    }

    addFiles(files)
    {
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
    }

    // Activate clicks on the lis
    activate()
    {
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
            let curLi = this.div.find('li.selected').first();
            // 38 is up, 40 is down
            if(e.which == 38) {
                e.preventDefault();
                if(e.metaKey || e.ctrlKey) {
                    let first = curLi.prevAll().not('.directory, .hidden').last();
                    first.click();
                    this.scrollIntoView(first);
                } else {
                    let prev = curLi.prevAll().not('.directory, .hidden').first();
                    prev.click();
                    this.scrollIntoView(prev);
                }
            } else if(e.which == 40) {
                e.preventDefault();
                if(e.metaKey || e.ctrlKey) {
                    let last = curLi.nextAll().not('.directory, .hidden').last();
                    last.click();
                    this.scrollIntoView(last);
                } else {
                    let next = curLi.nextAll().not('.directory, .hidden').first();
                    next.click();
                    this.scrollIntoView(next);
                }
            }
        });

        // Also make draggable
        this.div.find('li').not('.directory').draggable({
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
    }

    // Select a file if possible
    select(hash)
    {
        let elem = this.div.find('li[data-hash="'+hash+'"]');
        if(elem != null) {
            this.div.find('li').removeClass('selected');
            elem.addClass('selected');

            // Scroll into view if necessary
            this.scrollIntoView(elem);
        }
    }

    toggleTheme()
    {
        this.div.toggleClass('dark');
    }

    toggleDirectories()
    {
        this.div.toggleClass('no-directories');
    }

    // Toggle display of snippets
    toggleSnippets()
    {
        this.snippets = !this.snippets;
        this.div.find('span.snippet').toggleClass('hidden');

        // If necessary, scroll the selection into view
        let elem = this.div.find('li.selected');

        if(elem.length > 0) {
            this.scrollIntoView(elem);
        }
    }

    getLi(file)
    {
        let snip = '';

        if(!this.snippets) {
            snip = ' hidden';
        }

        let mtime = new Date(file.modtime);
        mtime = `${mtime.getFullYear()}-${mtime.getMonth()+1}-${mtime.getDate()} ${mtime.getHours()}:${mtime.getMinutes()}`;
        return `<li data-hash="${file.hash}" title="${file.name}">
        <strong>${file.name.substr(0, file.name.length-3)}
        </strong><br>
        <span class="snippet${snip}">${file.snippet}<br><small>${mtime}</small></span>
        </li>`;
    }

    dirLi(dir)
    {
        return `<li class="directory" title="${dir.name}">${dir.name}</li>`;
    }

    beginSearch(term)
    {
        // First sanitize the terms
        let myTerms = [];
        let curWord = "";
        let hasExact = false;
        let operator = 'AND';

        for(let i = 0; i < term.length; i++) {
            let c = term.charAt(i);
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
                    continue;
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

        // The search index will be increased BEFORE accessing the first file!
        this.currentSearchIndex = -1;

        // Aaaaand: Go!
        this.doSearch();
    }

    doSearch()
    {
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

        this.parent.searchProgress(this.currentSearchIndex, this.hashes.length);

        // Send a request to the main process and handle it afterwards.
        this.parent.ipc.send('search-file', {
            'hash': this.hashes[this.currentSearchIndex],
            'terms': this.currentSearch
        });
    }

    handleSearchResult(res)
    {
        if(res.result) {
            this.div.find('li[data-hash="' + res.hash + '"]').removeClass('hidden');
        }

        // Next search cycle
        this.doSearch();
    }

    endSearch()
    {
        this.parent.endSearch();
        this.currentSearchIndex = 0;
        this.hashes             = [];
        this.currentSearch      = null;
    }

    // END SEARCH

    scrollIntoView(elem)
    {
        // Do we have an element to scroll?
        if(!elem.length) {
            return;
        }

        // Somehow it is impossible to write position().top into a variable.
        // Workaround: Short name for position and then use as pos.top ...
        let pos = elem.position();
        let bot = pos.top + elem.outerHeight();
        let docHeight = this.div.height();
        let curScroll = this.div.scrollTop();
        // Top:
        if(pos.top < 0) {
            // Here we need to also substract the height of a directory ribbon
            // because there WILL be one.
            let ribbonHeight = this.div.find('li.directory').first().outerHeight();
            this.div.scrollTop(curScroll + pos.top - ribbonHeight);
        }
        // Down:
        if(bot > docHeight) {
            this.div.scrollTop(curScroll + bot - docHeight);
        }
    }
}

module.exports = ZettlrPreview;
