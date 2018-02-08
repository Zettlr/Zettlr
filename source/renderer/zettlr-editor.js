/* THIS CLASS CONTROLS THE CODEMIRROR EDITOR */

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

class ZettlrEditor
{
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#editor');
        this.fntooltipbubble = $('<div>').addClass('fn-panel');
        this.positions = []; // Saves the positions of the editor
        this.currentHash = null; // Needed for positions
        this.words = 0;

        this.cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
            mode: {
                name: 'spellchecker', // This automatically defines gfm as overlay mode
                closeBrackets: '()[]{}\'\'""»«“”‘’**__' // Doesn't work right now. But ill figure it out
            },
            theme: 'zettlr',
            lineWiseCopyCut: false, // Don't copy/cut whole lines without selection
            autofocus: false,
            dragDrop: false, // for now - REACTIVATE IN LATER PHASE
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
                'Ctrl-F'        : 'findPersistent',
                // Markdown-specific shortcuts
                'Cmd-B'         : 'markdownBold',
                'Ctrl-B'        : 'markdownBold',
                'Cmd-I'         : 'markdownItalic',
                'Ctrl-I'        : 'markdownItalic',
                'Cmd-K'         : 'markdownLink',
                'Ctrl-K'        : 'markdownLink',
                'Cmd-Shift-I'   : 'markdownImage',
                'Ctrl-Shift-I'  : 'markdownImage'
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

    runCommand(cmd)
    {
        this.cm.execCommand(cmd);
    }

    // Open a new file
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
    }

    // Close the current file
    close()
    {
        this.cm.setValue('');
        this.cm.markClean();
        this.cm.clearHistory();
        this.words = 0;
    }

    getWordCount()
    {
        return this.cm.getValue().split(' ').length;
    }

    getWrittenWords()
    {
        // Return the additional written words
        let cnt = this.getWordCount() - this.words;
        this.words = this.getWordCount();
        return cnt;
    }

    // Currently, this function is only called by the context menu class to
    // select a word. This function only selects the word if nothing else is
    // selected (to not fuck up some copy action someone tried to do)
    selectWordUnderCursor()
    {
        // Don't overwrite selections.
        if(this.cm.somethingSelected()) {
            return;
        }

        console.log(`Selecting word under cursor...`);

        let cur = this.cm.getCursor();
        let sel = this.cm.findWordAt(cur);
        this.cm.setSelection(sel.anchor, sel.head);

        console.log(`Selected ${this.cm.getSelection()}!`);
    }

    // Same -- currently only gets called by context menu
    replaceWord(word)
    {
        if(!this.cm.somethingSelected()) {
            // We obviously need a selection to replace
            return;
        }

        // Replace word and select new word
        this.cm.replaceSelection(word, 'around');
    }

    // Displays a tooltip under the element.
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

        // Now we either got a match or an empty fnref. Anyway: display
        this.fntooltipbubble.text(fnref);
        this.fntooltipbubble.attr('style', 'bottom:0; left:0; right:0; z-index:10000');
        this.div.append(this.fntooltipbubble);
    }

    toggleTheme()
    {
        if(this.div.hasClass('dark')) {
            this.div.removeClass('dark');
            this.cm.setOption("theme", 'zettlr');
        } else {
            this.div.addClass('dark');
            this.cm.setOption("theme", 'zettlr-dark');
        }
    }

    toggleDirectories()
    {
        this.div.toggleClass('no-directories');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this.cm.refresh();
    }

    togglePreview()
    {
        this.div.toggleClass('no-preview');
        // CodeMirror needs to recalculate the overlays etc., otherwise
        // it will be difficult to write, select, etc.
        this.cm.refresh();
    }

    // This message is triggered by the renderer process when the user selects
    // the menu item.
    openFind() { this.cm.execCommand("findPersistent"); }
    getValue() { return this.cm.getValue(); }
    markClean() { this.cm.markClean(); }
    // Is the editor unmodified?
    isClean() { return this.cm.doc.isClean(); }
}

module.exports = ZettlrEditor;
