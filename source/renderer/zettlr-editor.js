/* THIS CLASS CONTROLS THE CODEMIRROR EDITOR */

class ZettlrEditor
{
    constructor(parent)
    {
        this.parent = parent;
        this.div = $('#editor');
        this.positions = []; // Saves the positions of the editor
        this.currentHash = null; // Needed for positions

        this.cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
            mode: {
                name: 'spellchecker' // This automatically defines gfm as overlay mode
            },
            theme: 'zettlr',
            lineWiseCopyCut: false, // Don't copy/cut whole lines without selection
            autofocus: false, // Shouldn't be bad
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

            if(changeObj.origin != "setValue") {
                // If origin is setValue this means that the contents have been
                // programatically changed -> no need to flag any modification!
                this.parent.setModified();
            }
        });

        // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
        this.cm.on("renderLine", function(cm, line, elt) {

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
        this.cm.getWrapperElement().addEventListener('mousemove', e => {
            let t = $(e.target);
            if((t.hasClass('cm-url') || t.hasClass('cm-link')) && e.shiftKey) {
                t.addClass('shift');
            } else {
                t.removeClass('shift');
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
    }

    // This message is triggered by the renderer process when the user selects
    // the menu item.
    openFind()
    {
        // Persistent means the dialog does not hide.
        this.cm.execCommand("findPersistent");
    }

    getValue()
    {
        // Returns the current value. Will be called by ZettlrRenderer when the
        // user wants to save a file.
        return this.cm.getValue();
    }

    markClean()
    {
        this.cm.markClean();
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
    }

    togglePreview()
    {
        this.div.toggleClass('no-preview');
    }

    // Is the editor unmodified?
    isClean()
    {
        return this.cm.doc.isClean();
    }
}

module.exports = ZettlrEditor;
