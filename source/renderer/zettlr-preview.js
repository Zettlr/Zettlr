/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        ZettlrPreview class
 * CVM-Role:        Controller
 * Maintainer:      Hendrik Erz
 * License:         MIT
 *
 * Description:     Controls the file list in the preview pane.
 *
 * END HEADER
 */

const ListView = require('./list-view.js');

/**
 * This class represents the file tree as a two-dimensional list. It makes use
 * of the ListView class to actually render the list. It is rather similar to
 * the ZettlrDirectories class, but ZettlrPreview handles searches as well,
 * which makes the big share of the class's functionality.
 */
class ZettlrPreview
{
    /**
     * Initialize
     * @param {ZettlrRenderer} parent The renderer object
     */
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
    }

    /**
     * Needed for bubbling up the request of a new file
     * @param  {Integer} hash The hash of the file that's being requested
     * @return {void}      Nothing to return.
     */
    requestFile(hash)
    {
        // Request a file from the renderer
        this.parent.requestFile(hash);
    }

    /**
     * Refreshes the file list.
     * @return {ZettlrPreview} Chainability.
     */
    refresh()
    {
        if(this.parent.getCurrentDir() == null) {
            // Somehow the file array was empty
            return;
        }
        this.list.refresh(this.parent.getCurrentDir());
        // Potentially re-select the current file
        this.select(this.parent.getCurrentFile());

        return this;
    }

    /**
     * Simply select a file.
     * @param  {Integer} hash Hash of the file to be selected
     * @return {ZettlrPreview}      Chainability.
     */
    select(hash)
    {
        this.list.select(hash);
        return this;
    }

    /**
     * Toggles the theme
     * @return {ZettlrPreview} Chainability.
     */
    toggleTheme()
    {
        this.div.toggleClass('dark');
        return this;
    }

    /**
     * Toggles the display of the directory tree.
     * @return {ZettlrPreview} Chainability.
     */
    toggleDirectories()
    {
        this.div.toggleClass('no-directories');
        return this;
    }

    /**
     * Toggle the snippets.
     * @return {ZettlrPreview} Chainability.
     */
    toggleSnippets()
    {
        this.snippets = !this.snippets;
        this.list.toggleSnippets();
        return this;
    }

    /**
     * The user has requested a search. This function prepares the terms and commences the search.
     * @param  {String} term The value of the search field.
     * @return {void}      Nothing to return.
     */
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

    /**
     * Do one single search cycle.
     * @return {void} Nothing to return.
     */
    doSearch()
    {
        if(this.hashes.length == 0) {
            this.endSearch();
            return;
        }

        // We got an array to search through.
        if(this.currentSearchIndex == (this.hashes.length-1)) {
            // End search
            this.parent.endSearch();
            return;
        }
        if(this.currentSearchIndex > this.hashes.length) {
            this.parent.endSearch();
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

    /**
     * Handle the result of the search from main process.
     * @param  {Object} res Contains the search result and the hash.
     * @return {void}     Nothing to return.
     */
    handleSearchResult(res)
    {
        if(res.result) {
            this.div.find('li[data-hash="' + res.hash + '"]').removeClass('hidden');
        }

        // Next search cycle
        this.doSearch();
    }

    /**
     * Ends a search if there are no more hashes to search through.
     * @return {void} Nothing to return.
     */
    endSearch()
    {
        this.currentSearchIndex = 0;
        this.hashes             = [];
        this.currentSearch      = null;
    }

    /**
     * Shows all files that may have been hidden by a search
     */
    showFiles()
    {
        this.div.find('li').removeClass('hidden');
    }

    // END SEARCH

    /**
     * Update the files displayed.
     * @param  {Object} files A directory tree.
     * @return {ZettlrPreview}       Chainability.
     */
    update(files)
    {
        this.list.refresh(files);
        return this;
    }
}

module.exports = ZettlrPreview;
