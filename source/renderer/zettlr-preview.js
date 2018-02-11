/* THIS CLASS CONTROLS THE FILE PREVIEW LIST */

const ListView = require('./list-view.js');

class ZettlrPreview
{
    constructor(parent)
    {
        this.parent             = parent;
        this.snippets           = true;

        // Elements
        this.div                = $('#preview');
        this.list               = new ListView(this, this.div, this.snippets);

        // Search related
        this.hashes             = null;
        this.currentSearch      = null;
        this.currentSearchIndex = 0;

        // Add event listener for ending search
        $('.end-search').on('click', (e) => {
            this.div.find('li').removeClass('hidden');
        });
    }

    requestFile(hash)
    {
        // Request a file from the renderer
        this.parent.requestFile(hash);
    }

    refresh()
    {
        if(this.parent.getCurrentDir() == null) {
            // Somehow the file array was empty
            return;
        }
        this.list.refresh(this.parent.getCurrentDir());
    }

    // Select a file if possible
    select(hash) { this.list.select(hash); }

    toggleTheme() { this.div.toggleClass('dark'); }

    toggleDirectories() { this.div.toggleClass('no-directories'); }

    // Toggle display of snippets
    toggleSnippets()
    {
        this.snippets = !this.snippets;
        this.list.toggleSnippets();
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
        this.list.each((listelem) => {
            if(listelem.isFile()) {
                listelem.hide();
                this.hashes.push(listelem.hash);
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

        // TODO: Move out send-methods from all files except renderer!
        // Send a request to the main process and handle it afterwards.
        this.parent.ipc.send('file-search', {
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

    update(files)
    {
        this.list.refresh(files);
    }
}

module.exports = ZettlrPreview;
