/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrEditor class
* CVM-Role:        View
* Maintainer:      Hendrik Erz
* License:         MIT
*
* Description:     This class controls and initialized the CodeMirror editor.
*
* END HEADER
*/

const path = require('path');

// First codemirror addons
require('codemirror/addon/mode/overlay');
require('codemirror/addon/edit/continuelist');
require('codemirror/addon/edit/indentlist');
require('codemirror/addon/search/search');
require('codemirror/addon/search/searchcursor');
require('codemirror/addon/search/jump-to-line');
require('codemirror/addon/dialog/dialog.js');
require('codemirror/addon/edit/closebrackets');

// Modes
require('codemirror/mode/markdown/markdown');
require('codemirror/mode/gfm/gfm');

// Zettlr specific addons
require('./assets/codemirror/zettlr-plugin-markdown-shortcuts.js');
require('./assets/codemirror/zettlr-modes-spellchecker-zkn.js');
require('./assets/codemirror/zettlr-plugin-footnotes.js');

const {generateId} = require('../common/zettlr-helpers.js');

// Finally CodeMirror itself
const CodeMirror = require('codemirror');

// The timeout after which a "save"-command is triggered to automatically save changes
const SAVE_TIMOUT = require('../common/data.json').poll_time;

/**
* This class propably has the most `require`s in it, because it loads all
* functionality concerning the CodeMirror editor. It loads them, initializes
* the editor and then does stuff related to the editor. This class, together with
* the ZettlrDialog class is of somewhat problematic appearance because here two
* styles of programming clash: My own and the one of CodeMirror. As I have to
* hook into their API for interacting with CodeMirror you will see unusual
* functions.
*/
class ZettlrEditor
{
    /**
    * Instantiate the editor
    * @param {ZettlrRenderer} parent The parent renderer element.
    */
    constructor(parent)
    {
        this._renderer = parent;
        this._div = $('#editor');
        this._fntooltipbubble = $('<div>').addClass('fn-panel');
        this._positions = [];        // Saves the positions of the editor
        this._currentHash = null;    // Needed for positions
        this._words = 0;             // Currently written words
        this._fontsize = 100;        // Font size (used for zooming)
        this._timeout = null;        // Stores a current timeout for a save-command
        this._inlineImages = [];     // Image widgets that are currently rendered
        this._inlineLinks = [];      // Inline links that are currently rendered
        this._prevSelections = [];   // Used to save all selections before a command is run to re-select

        // These are used for calculating a correct word count
        this._blockElements = require('../common/data.json').block_elements;

        this._cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
            mode: {
                name: 'markdown-zkn' // This will automatically pull in spellchecker and this gfm mode
            },
            theme: 'zettlr',
            autofocus: false,
            lineWrapping: true,
            autoCloseBrackets: {
                pairs: '()[]{}\'\'""»«„”“”‘’__``', // Autoclose markdown specific stuff
                override: true
            },
            extraKeys: {
                'Ctrl-Shift-F'  : false,  // Triggers replace in CodeMirror, disables global search
                'Cmd-Shift-F'   : false,
                'Enter'         : 'newlineAndIndentContinueMarkdownList',
                'Tab'           : 'autoIndentMarkdownList',
                'Shift-Tab'     : 'autoUnindentMarkdownList',
                // Default bindings are non-persistent searches (dialog hides after enter)
                'Cmd-F'         : 'findPersistent',
                'Ctrl-F'        : 'findPersistent'
            }
        });

        this._cm.on('change', (cm, changeObj) => {
            // The contents have been changed — so fire an event to main process to
            // set the window modified

            // Update wordcount
            this._renderer.updateWordCount(this.getWordCount());

            if(changeObj.origin != "setValue") {
                // If origin is setValue this means that the contents have been
                // programatically changed -> no need to flag any modification!
                this._renderer.setModified();

                // Automatically save the file each time there have been changes
                if(this._timeout) {
                    clearTimeout(this._timeout);
                }

                this._timeout = setTimeout((e) => { this._renderer.saveFile(); }, SAVE_TIMOUT);
            }
        });

        // On cursor activity (not the mouse one but the text one), render all
        // things we should replace in the sense of render directly in the text
        // such as images, links, other stuff.
        this._cm.on('cursorActivity', (cm) => {
            // This event fires on either editor changes (because, obviously the
            // cursor changes its position as well then) or when the cursor moves.
            this._renderImages();
            this._renderLinks();
        });

        // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
        this._cm.on("renderLine", (cm, line, elt) => {

            let charWidth = cm.defaultCharWidth() - 2;
            let basePadding = 4;
            // Show continued list/qoute lines aligned to start of text rather
            // than first non-space char.  MINOR BUG: also does this inside
            // literal blocks.
            let leadingSpaceListBulletsQuotes = /^\s*([*+-]\s+|\d+\.\s+|>\s*)*/;
            let leading = (leadingSpaceListBulletsQuotes.exec(line.text) || [""])[0];
            let off = CodeMirror.countColumn(leading, leading.length, cm.getOption("tabSize")) * charWidth;

            elt.style.textIndent = "-" + off + "px";
            elt.style.paddingLeft = (basePadding + off) + "px";
        });

        // Display a footnote if the target is a link (and begins with ^)
        this._cm.getWrapperElement().addEventListener('mousemove', (e) => {
            let t = $(e.target);
            if(t.hasClass('cm-link') && t.text().indexOf('^') === 0) {
                this._fntooltip(t);
            } else {
                this._fntooltipbubble.detach();
            }
        });

        this._cm.getWrapperElement().addEventListener('click', (e) => {
            if(!e.altKey) { // Such links open on ALT-Click (b/c CodeMirror handles Ctrl+Cmd)
                return true; // Stop handling event.
            }
            e.preventDefault();

            let elem = $(e.target);
            if(elem.hasClass('cm-zkn-tag')) {
                // The user clicked a zkn link -> create a search
                this._renderer.autoSearch(elem.text());
            } else if(elem.hasClass('cm-zkn-link')) {
                this._renderer.autoSearch(elem.text().replace(/[\[\]]/g, ''), true);
            }
        });

        this._cm.refresh();
    }
    // END constructor

    /**
    * Renders images for all valid image-tags in the document.
    */
    _renderImages()
    {
        let imageRE = /^!\[(.+?)\]\((.+?)\)$/;
        let i = 0;
        let rendered = [];

        // First remove images that may not exist anymore. As soon as someone
        // clicks into the image, it will be automatically removed, as well as
        // if someone simply deletes the whole line.
        do {
            if(!this._inlineImages[i]) {
                continue;
            }
            if(this._inlineImages[i] && this._inlineImages[i].find() === undefined) {
                // Marker is no longer present, so splice it
                this._inlineImages.splice(i, 1);
            } else {
                // Push the marker's actual _line_ (not the index) into the
                // rendered array.
                rendered.push(this._inlineImages[i].find().from.line);
                // Array is same size, so increase i
                i++;
            }
        } while(i < this._inlineImages.length);

        // Now render all potential new images
        for(let i = 0; i < this._cm.doc.lineCount(); i++)
        {
            // Already rendered, so move on
            if(rendered.includes(i)) {
                continue;
            }

            // Cursor is in here, so also don't render (for now)
            if(this._cm.doc.getCursor('from').line === i) {
                continue;
            }

            // First get the line and test if the contents contain an image
            let line = this._cm.doc.getLine(i);
            if(!imageRE.test(line)) {
                continue;
            }

            // Extract information from the line
            let match = imageRE.exec(line);
            let caption = match[1];
            let url = match[2];

            // Retrieve lineInfo for line number
            let lineInfo = this._cm.doc.lineInfo(i);
            let img = new Image();
            // Now add a line widget to this line.
            let textMarker = this._cm.doc.markText(
                {'line':lineInfo.line, 'ch':0},
                {'line':lineInfo.line, 'ch':line.length},
                {
                    'clearOnEnter': true,
                    'replacedWith': img,
                    'handleMouseEvents': true
                }
            );

            // Display a replacement image in case the correct one is not found
            img.onerror = (e) => {
                // Obviously, the real URL has not been found. Let's do
                // a check if a relative path works, by using the path of the
                // current file and joining it with the url. Maybe this works.
                let rel = path.dirname(this._renderer.getCurrentFile().path);
                rel = path.join(rel, url);

                // If this does not work, then simply fall back to the 404 image.
                img.onerror = (e) => { img.src = `file://${__dirname}/assets/image-not-found.png` };

                // Try it
                img.src = rel;
            };
            img.style.width = '100%';
            img.style.maxHeight = '100%';
            img.style.cursor = 'default'; // Nicer cursor
            img.src = url;
            img.onclick = (e) => { textMarker.clear(); };

            // ... and simply do it by the onload-function.
            img.onload = () => {
                let aspect = img.getBoundingClientRect().width / img.naturalWidth;
                let h = Math.round(img.naturalHeight * aspect);
                img.title = `${caption} (${img.naturalWidth}x${img.naturalHeight}px)`;
                textMarker.changed();
            }

            // Finally: Push the textMarker into the array
            this._inlineImages.push(textMarker);
        }
    }

    /**
     * Renders all links in the document into clickable links.
     */
    _renderLinks()
    {
        let linkRE = /\[(.+?)\]\((.+?)\)|(https?\S+|www\S+)/g; // Matches [Link](www.xyz.tld) and simple links
        let i = 0;
        let match;

        // First remove links that don't exist anymore. As soon as someone
        // moves the cursor into the link, it will be automatically removed,
        // as well as if someone simply deletes the whole line.
        do {
            if(!this._inlineLinks[i]) {
                continue;
            }
            if(this._inlineLinks[i].find() === undefined) {
                // Marker is no longer present, so splice it
                this._inlineLinks.splice(i, 1);
            } else {
                i++;
            }
        } while(i < this._inlineLinks.length);

        // Now render all potential new links
        for(let i = 0; i < this._cm.doc.lineCount(); i++)
        {
            // Always reset lastIndex property, because test()-ing on regular
            // expressions advance it.
            linkRE.lastIndex = 0;

            // First get the line and test if the contents contain a link
            let line = this._cm.doc.getLine(i);
            if(!linkRE.test(line)) {
                continue;
            }

            linkRE.lastIndex = 0;

            // Run through all links on this line
            while((match = linkRE.exec(line)) != null) {
                if((match.index > 0) && (line[match.index-1] == '!')) {
                    continue;
                }
                let caption = match[1] || '';
                let url = match[2] || '';
                let standalone = match[3] || '';

                // Now get the precise beginning of the match and its end
                let curFrom = { 'line': i, 'ch': match.index };
                let curTo = { 'line': i, 'ch': match.index + match[0].length };

                let cur = this._cm.doc.getCursor('from');
                if(cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
                    // Cursor is in selection: Do not render.
                    continue;
                }

                // Has this thing already been rendered?
                let marks = this._cm.doc.findMarks(curFrom, curTo);
                for(let marx of marks) {
                    if(this._inlineLinks.includes(marx)) {
                        // We've got communism. (Sorry for the REALLY bad pun.)
                        continue;
                    }
                }

                let a = document.createElement('a');
                if(standalone) {
                    // In case of a standalone link, all is the same
                    a.innerHTML = standalone;
                    a.title = standalone;
                    url = standalone;
                } else {
                    a.innerHTML = caption; // TODO: Better testing against HTML entities!
                    a.title = url; // Set the url as title to let users see where they're going
                }
                a.className = 'cma'; // CodeMirrorAnchors
                // Apply TextMarker
                let textMarker = this._cm.doc.markText(
                    curFrom, curTo,
                    {
                        'clearOnEnter': true,
                        'replacedWith': a,
                        'inclusiveLeft': false,
                        'inclusiveRight': false
                    }
                );

                a.onclick = function(e) {
                    // Only open ALT-clicks (Doesn't select and also is not used
                    // elsewhere)
                    if(e.altKey) {
                        e.preventDefault();
                        require('electron').shell.openExternal(url);
                    } else {
                        textMarker.clear();
                    }
                };

                this._inlineLinks.push(textMarker);
            }
        }
    }

    /**
    * Opens a file, i.e. replaced the editor's content
    * @param  {ZettlrFile} file The file to be renderer
    * @return {ZettlrEditor}      Chainability.
    */
    open(file)
    {
        if(this._currentHash != null) {
            let rect = this._cm.getWrapperElement().getBoundingClientRect();
            let topVisibleLine = this._cm.lineAtHeight(rect.top, "window");
            this._positions[this._currentHash] = {
                'scroll': topVisibleLine
            };
        }

        this._cm.setValue(file.content);
        this._currentHash = 'hash' + file.hash;
        this._words = this.getWordCount();

        // Mark clean, because now we got a new (and therefore unmodified) file
        this._cm.markClean();
        this._cm.clearHistory(); // Clear history so that no "old" files can be
        // recreated using Cmd/Ctrl+Z.

        if(this._positions[this._currentHash] !== undefined) {
            this.jtl(this._positions[this._currentHash].scroll);
        } else {
            // Default to start positions
            this.jtl(0);
        }

        return this;
    }

    /**
    * Closes the current file.
    * @return {ZettlrEditor} Chainability.
    */
    close()
    {
        this._cm.setValue('');
        this._cm.markClean();
        this._cm.clearHistory();
        this._words = 0;
        this._prevSeletions = [];
        return this;
    }

    /**
    * Returns the current word count in the editor.
    * @return {Integer} The word count.
    */
    getWordCount()
    {
        if(this._cm.getValue() == '') return 0;

        let words = this._cm.getValue().split(/[\s ]+/);

        let i = 0;

        // Remove block elements from word count to get a more accurate count.
        while(i < words.length) {
            if(this._blockElements.includes(words[i])) {
                words.splice(i, 1);
            } else {
                i++;
            }
        }

        return words.length;
    }

    /**
    * Returns the (newly) written words since the last time this function was
    * called.
    * @return {Integer} The delta of the word count.
    */
    getWrittenWords()
    {
        // Return the additional written words
        let nbr = this.getWordCount() - this._words;
        this._words = this.getWordCount();
        return nbr;
    }

    /**
    * Selects a word that is under the current cursor.
    * Currently, this function is only called by the context menu class to
    * select a word. This function only selects the word if nothing else is
    * selected (to not fuck up some copy action someone tried to do)
    * @return {void} Nothing to return.
    */
    selectWordUnderCursor()
    {
        // Don't overwrite selections.
        if(this._cm.somethingSelected()) {
            return;
        }

        let cur = this._cm.getCursor();
        let sel = this._cm.findWordAt(cur);
        this._cm.setSelection(sel.anchor, sel.head);
    }

    /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
    replaceWord(word)
    {
        if(!this._cm.somethingSelected()) {
            // We obviously need a selection to replace
            return;
        }

        // Replace word and select new word
        this._cm.replaceSelection(word, 'around');
    }

    /**
     * Inserts a new ID at the current cursor position
     */
    insertId()
    {
        if(!this._cm.somethingSelected()) {
            // Don't replace selections
            this._cm.replaceSelection(generateId());
            this._cm.focus();
        } else {
            // Save and afterwards retain the selections
            this._prevSelections = this._cm.doc.listSelections();
            this._cm.setCursor({'line': this._cm.doc.lastLine(), 'ch': this._cm.doc.getLine(this._cm.doc.lastLine()).length });
            this._cm.replaceSelection('\n\n'+generateId()); // Insert at the end of document
            this._cm.doc.setSelections(this._prevSelections);
            this._prevSelections = [];
        }
    }

    /**
    * Displays the footnote content for a given footnote (element)
    * @param  {jQuery} element The footnote element
    * @return {void}         Nothing to return.
    */
    _fntooltip(element)
    {
        // Because we highlight the formatting as well, the element's text will
        // only contain ^<id> without the brackets
        let fn = element.text().substr(1);
        let fnref = '';

        // Now find the respective line and extract the footnote content using
        // our RegEx from the footnotes plugin.
        let fnrefRE = /^\[\^([\da-zA-Z_-]+)\]: (.+)/gm;

        for(let lineNo = this._cm.doc.lastLine(); lineNo > -1; lineNo--) {
            fnrefRE.lastIndex = 0;
            let line = this._cm.doc.getLine(lineNo);
            let match = null;
            if(((match = fnrefRE.exec(line)) != null) && (match[1] == fn)) {
                fnref = match[2];
                break;
            }
        }

        if(!fnref || fnref === '') {
            // Indicate that the footnote is empty
            this._fntooltipbubble.html('<em>no reference text</em>');
        } else {
            this._fntooltipbubble.text(fnref);
        }

        // Now we either got a match or an empty fnref. Anyway: display
        this._fntooltipbubble.attr('style', 'bottom:0; left:0; right:0; z-index:10000');
        this._div.append(this._fntooltipbubble);
    }

    /**
    * This function builds a table of contents based on the editor contents
    * @return {Array} An array containing objects with all headings
    */
    buildTOC()
    {
        let cnt = this._cm.getValue().split('\n');
        let toc = [];
        for(let i in cnt) {
            if(/^#{1,6} /.test(cnt[i])) {
                toc.push({
                    'line': i,
                    'text': cnt[i].replace(/^#{1,6} /, ''),
                    'level': (cnt[i].match(/#/g) || []).length
                });
            }
        }

        return toc;
    }

    /**
    * Small function that jumps to a specific line in the editor.
    * @param  {Integer} line The line to pull into view
    * @return {void}      No return.
    */
    jtl(line)
    {
        // Wow. Such magic.
        this._cm.doc.setCursor({ 'line' : line, 'ch': 0 });
        this._cm.refresh();
    }

    /**
    * Toggles the theme.
    * @return {ZettlrEditor} Chainability.
    */
    toggleTheme()
    {
        if(this._div.hasClass('dark')) {
            this._div.removeClass('dark');
            this._cm.setOption("theme", 'zettlr');
        } else {
            this._div.addClass('dark');
            this._cm.setOption("theme", 'zettlr-dark');
        }

        return this;
    }

    /**
    * Called when the directories are shown/hidden
    * @return {ZettlrEditor} Chainability.
    */
    toggleDirectories()
    {
        this._div.toggleClass('no-directories');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this._cm.refresh();
        return this;
    }

    /**
    * Called when the preview list is shown/hidden
    * @return {ZettlrEditor} Chainability.
    */
    togglePreview()
    {
        this._div.toggleClass('no-preview');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this._cm.refresh();
        return this;
    }

    /**
    * Alter the font size of the editor.
    * @param  {Integer} direction The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
    * @return {ZettlrEditor}           Chainability.
    */
    zoom(direction) {
        if(direction === 0) {
            this._fontsize = 100;
        } else {
            this._fontsize = this._fontsize + 10*direction
        }
        this._div.css('font-size', this._fontsize + '%');
        this._cm.refresh();
        return this;
    }

    /**
    * The CodeMirror instane should open the find dialog
    * @return {void} Nothing to return.
    */
    openFind() { this._cm.execCommand("findPersistent"); }

    /**
    * Returns the current value of the editor.
    * @return {String} The current editor contents.
    */
    getValue() { return this._cm.getValue(); }

    /**
    * Mark clean the CodeMirror instance
    * @return {void} Nothing to return.
    */
    markClean() { this._cm.markClean(); }

    /**
    * Query if the editor is currently modified
    * @return {Boolean} True, if there are no changes, false, if there are.
    */
    isClean() { return this._cm.doc.isClean(); }

    /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
    runCommand(cmd)
    {
        this._prevSelections = this._cm.doc.listSelections();
        this._cm.execCommand(cmd);

        if(this._prevSelections.length > 0) {
            this._cm.doc.setSelections(this._prevSelections);
            this._prevSelections = [];
        }
    }

    /**
     * Focus the CodeMirror instance
     */
    focus() { this._cm.focus(); }
}

module.exports = ZettlrEditor;
