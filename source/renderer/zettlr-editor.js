/**
* @ignore
* BEGIN HEADER
*
* Contains:        ZettlrEditor class
* CVM-Role:        Model
* Maintainer:      Hendrik Erz
* License:         MIT
*
* Description:     This class controls and initialized the CodeMirror editor.
*
* END HEADER
*/

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
require('./assets/codemirror/zettlr-plugin-spellchecker.js');
require('./assets/codemirror/zettlr-plugin-footnotes.js');

// Finally CodeMirror itself
const CodeMirror = require('codemirror');

/**
* ZettlrEditor class
*/
class ZettlrEditor
{
    /**
    * Instantiate the editor
    * @param {ZettlrRenderer} parent The parent renderer element.
    */
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#editor');
        this.fntooltipbubble = $('<div>').addClass('fn-panel');
        this.positions = []; // Saves the positions of the editor
        this.currentHash = null; // Needed for positions
        this.words = 0;
        this.fontsize = 100;
        this.inlineImages = []; // Image widgets that are currently rendered

        this.cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
            mode: {
                name: 'spellchecker', // This automatically defines gfm as overlay mode
                closeBrackets: '()[]{}\'\'""»«“”‘’**__' // Doesn't work right now. But ill figure it out
            },
            theme: 'zettlr',
            autofocus: false,
            lineWrapping: true,
            autoCloseBrackets: true, // Autoclose brackets and quotes
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

        this.cm.on('change', (cm, changeObj) => {
            // The contents have been changed — so fire an event to main process to
            // set the window modified

            // Update wordcount
            this.parent.updateWordCount(this.getWordCount());

            if(changeObj.origin != "setValue") {
                // If origin is setValue this means that the contents have been
                // programatically changed -> no need to flag any modification!
                this.parent.setModified();
            }
        });

        // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
        this.cm.on("renderLine", (cm, line, elt) => {

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

            // Test for images to be rendered.
            //console.log(line);
            this.renderImage(line);
        });

        // Turn cursor into pointer while hovering link with pressed shift
        this.cm.getWrapperElement().addEventListener('mousemove', (e) => {
            let t = $(e.target);
            if((t.hasClass('cm-url') || t.hasClass('cm-link')) && e.shiftKey) {
                t.addClass('shift');
            } else {
                t.removeClass('shift');
            }

            // Display a footnote if the target is a link (and begins with ^)
            if(t.hasClass('cm-link') && t.text().indexOf('^') === 0) {
                this.fntooltip(t);
            } else {
                this.fntooltipbubble.detach();
            }
        });

        this.div.on('click', (e) => {
            if(e.shiftKey) {
                // Now we're handling
                e.preventDefault();
                e.stopPropagation();
                $(e.target).removeClass('shift');
                let url = $(e.target).text();
                if(/https?/.test(url)) {
                    require('electron').shell.openExternal(url);
                }
            }
        });

        this.cm.refresh();
    }

    renderImages()
    {
        let imageRE = /^!\[(.*?)\]\((.*?)\)/;

        for(let widget of this.inlineImages) {
            widget.close();
        }
        
        for(let i = 0; i < this.cm.lineCount(); i++) {
            if(!imageRE.test(line.text)) {
                // Not an image
                continue;
            }
            let match = imageRE.exec(line.text);
            console.log(`Found image in line beginning with "${line.text.substr(0.15)}..."!`);
            let caption = match[1] || '';
            let url = match[2] || '';
            if(url == '') {
                // Nothing to render here
                continue;
            }
        }

        let realUrl = url;
        // TODO: Some testing concerning the validity of the URL

        console.log(`Creating image`);
        let img = document.createElement('img');
        img.src = realUrl;
        img.alt = caption;
        img.title = caption;
        console.log(`Adding line widget!`);
        return;
        let lw = this.cm.addLineWidget(line, img, {noHScroll:true, above:true});
        console.log(lw);
        this.inlineImages.push(lw);

        // TODO: Render the actual line image
    }

    /**
    * Opens a file, i.e. replaced the editor's content
    * @param  {ZettlrFile} file The file to be renderer
    * @return {ZettlrEditor}      Chainability.
    */
    open(file)
    {
        if(this.currentHash != null) {
            let cr = this.cm.doc.getCursor();
            this.positions[this.currentHash] = {
                'cursor': JSON.parse(JSON.stringify(cr)),
                'scroll': $('.CodeMirror-scroll').offset()['top']
            };
        }

        this.cm.setValue(file.content);
        this.currentHash = 'hash' + file.hash;
        this.words = this.getWordCount();

        // Mark clean, because now we got a new (and therefore unmodified) file
        this.cm.markClean();
        this.cm.clearHistory(); // Clear history so that no "old" files can be
        // recreated using Cmd/Ctrl+Z.

        if(this.positions[this.currentHash] !== undefined) {
            this.cm.setCursor(this.positions[this.currentHash].cursor);
            $('CodeMirror-scroll').scrollTop(this.positions[this.currentHash].scroll);
        } else {
            // Default to start positions
            this.cm.doc.setCursor({line: 0, ch: 0});
            $('#CodeMirror-scroll').scrollTop(0);
        }

        return this;
    }

    /**
    * Closes the current file.
    * @return {ZettlrEditor} Chainability.
    */
    close()
    {
        this.cm.setValue('');
        this.cm.markClean();
        this.cm.clearHistory();
        this.words = 0;
        return this;
    }

    /**
    * Returns the current word count in the editor.
    * @return {Integer} The word count.
    */
    getWordCount()
    {
        return this.cm.getValue().split(' ').length;
    }

    /**
    * Returns the (newly) written words since the last time this function was
    * called.
    * @return {Integer} The delta of the word count.
    */
    getWrittenWords()
    {
        // Return the additional written words
        let cnt = this.getWordCount() - this.words;
        this.words = this.getWordCount();
        return cnt;
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
        if(this.cm.somethingSelected()) {
            return;
        }

        let cur = this.cm.getCursor();
        let sel = this.cm.findWordAt(cur);
        this.cm.setSelection(sel.anchor, sel.head);
    }

    /**
    * Replaces the currently selected words. Is only called by the context
    * menu currently.
    * @param  {String} word The new word.
    * @return {void}      Nothing to return.
    */
    replaceWord(word)
    {
        if(!this.cm.somethingSelected()) {
            // We obviously need a selection to replace
            return;
        }

        // Replace word and select new word
        this.cm.replaceSelection(word, 'around');
    }

    /**
    * Displays the footnote content for a given footnote (element)
    * @param  {jQuery} element The footnote element
    * @return {void}         Nothing to return.
    */
    fntooltip(element)
    {
        // Because we highlight the formatting as well, the element's text will
        // only contain ^<id> without the brackets
        let fn = element.text().substr(1);
        let fnref = '';

        // Now find the respective line and extract the footnote content using
        // our RegEx from the footnotes plugin.
        let fnrefRE = /^\[\^([\da-zA-Z_-]+)\]: (.+)/gm;

        for(let lineNo = this.cm.doc.lastLine(); lineNo > -1; lineNo--) {
            fnrefRE.lastIndex = 0;
            let line = this.cm.doc.getLine(lineNo);
            let match = null;
            if(((match = fnrefRE.exec(line)) != null) && (match[1] == fn)) {
                fnref = match[2];
                break;
            }
        }

        if(!fnref || fnref === '') {
            // Indicate that the footnote is empty
            this.fntooltipbubble.html('<em>no reference text</em>');
        } else {
            this.fntooltipbubble.text(fnref);
        }

        // Now we either got a match or an empty fnref. Anyway: display
        this.fntooltipbubble.attr('style', 'bottom:0; left:0; right:0; z-index:10000');
        this.div.append(this.fntooltipbubble);
    }

    /**
    * This function builds a table of contents based on the editor contents
    * @return {Array} An array containing objects with all headings
    */
    buildTOC()
    {
        let cnt = this.cm.getValue().split('\n');
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
        this.cm.doc.setCursor({ 'line' : line, 'ch': 0 });
        this.cm.refresh();
    }

    /**
    * Toggles the theme.
    * @return {ZettlrEditor} Chainability.
    */
    toggleTheme()
    {
        if(this.div.hasClass('dark')) {
            this.div.removeClass('dark');
            this.cm.setOption("theme", 'zettlr');
        } else {
            this.div.addClass('dark');
            this.cm.setOption("theme", 'zettlr-dark');
        }

        return this;
    }

    /**
    * Called when the directories are shown/hidden
    * @return {ZettlrEditor} Chainability.
    */
    toggleDirectories()
    {
        this.div.toggleClass('no-directories');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this.cm.refresh();
        return this;
    }

    /**
    * Called when the preview list is shown/hidden
    * @return {ZettlrEditor} Chainability.
    */
    togglePreview()
    {
        this.div.toggleClass('no-preview');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this.cm.refresh();
        return this;
    }

    /**
    * Alter the font size of the editor.
    * @param  {Integer} direction The direction, can be 1 (increase), -1 (decrease) or 0 (reset)
    * @return {ZettlrEditor}           Chainability.
    */
    zoom(direction) {
        if(direction === 0) {
            this.fontsize = 100;
        } else {
            this.fontsize = this.fontsize + 10*direction
        }
        this.div.css('font-size', this.fontsize + '%');
        this.cm.refresh();
        return this;
    }

    /**
    * The CodeMirror instane should open the find dialog
    * @return {void} Nothing to return.
    */
    openFind() { this.cm.execCommand("findPersistent"); }

    /**
    * Returns the current value of the editor.
    * @return {String} The current editor contents.
    */
    getValue() { return this.cm.getValue(); }

    /**
    * Mark clean the CodeMirror instance
    * @return {void} Nothing to return.
    */
    markClean() { this.cm.markClean(); }

    /**
    * Query if the editor is currently modified
    * @return {Boolean} True, if there are no changes, false, if there are.
    */
    isClean() { return this.cm.doc.isClean(); }

    /**
    * Run a CodeMirror command.
    * @param  {String} cmd The command to be passed to cm.
    * @return {void}     Nothing to return.
    */
    runCommand(cmd) { this.cm.execCommand(cmd); }
}

module.exports = ZettlrEditor;
