/* THIS CLASS CONTROLS THE CODEMIRROR EDITOR */

function ZettlrEditor(parent)
{
    this.parent = parent;
    this.cm;
    this.div;
    this.positions = []; // Saves the positions of the editor
    this.currentHash = null; // Needed for positions

    this.init = function() {
        this.div = $('#editor');

        this.cm = CodeMirror.fromTextArea(document.getElementById('cm-text'), {
            mode: {
                name: "gfm",
                highlightFormatting: true, // Highlight the markdown meta chars separately
                tokenTypeOverrides: {
                    emoji: "emoji"
                }
            },
            theme: 'zettlr',
            lineWiseCopyCut: false, // Don't copy/cut whole lines without selection
            autofocus: true, // Shouldn't be bad
            dragDrop: false, // for now - REACTIVATE IN LATER PHASE
            lineWrapping: true,
            autoCloseBrackets: true, // Autoclose brackets and quotes
            extraKeys: {
                // Disable handling of the deletion-keys by CodeMirror
                'Cmd-D': false,
                'Cmd-Shift-D': false,
                'Ctrl-D': false,
                'Ctrl-Shift-D': false,
                'Ctrl-Shift-F': false,  // Triggers replace in CodeMirror, disables global search
                'Enter': 'newlineAndIndentContinueMarkdownList',
                'Tab': 'autoIndentMarkdownList',
                'Shift-Tab': 'autoUnindentMarkdownList',
                // Default bindings are non-persistent searches (dialog hides after enter)
                'Cmd-F': 'findPersistent',
                'Ctrl-F': 'findPersistent',
                // Markdown-specific shortcuts
                'Cmd-B': 'markdownBold',
                'Ctrl-B': 'markdownBold',
                'Cmd-I': 'markdownItalic',
                'Ctrl-I': 'markdownItalic',
                'Cmd-K': 'markdownLink',
                'Ctrl-K': 'markdownLink',
                'Cmd-Shift-I': 'markdownImage',
                'Ctrl-Shift-I': 'markdownImage'
            }
        });

        // Register event listeners
        let that = this;
        this.cm.on('change', function(cm, changeObj) {
            // The contents have been changed — so fire an event to main process to
            // set the window modified

            if(changeObj.origin != "setValue") {
                // If origin is setValue this means that the contents have been
                // programatically changed -> no need to flag any modification!
                that.parent.setModified();
            }
        });

        // Thanks for this to https://discuss.codemirror.net/t/hanging-indent/243/2
        var charWidth = this.cm.defaultCharWidth() - 2, basePadding = 4;
        this.cm.on("renderLine", function(cm, line, elt) {

            // Show continued list/qoute lines aligned to start of text rather
            // than first non-space char.  MINOR BUG: also does this inside
            // literal blocks.
            var leadingSpaceListBulletsQuotes = /^\s*([*+-]\s+|\d+\.\s+|>\s*)*/;
            var leading = (leadingSpaceListBulletsQuotes.exec(line.text) || [""])[0];
            var off = CodeMirror.countColumn(leading, leading.length, cm.getOption("tabSize")) * charWidth;
            //var off = CodeMirror.countColumn(line.text, null, cm.getOption("tabSize")) * charWidth;

            elt.style.textIndent = "-" + off + "px";
            elt.style.paddingLeft = (basePadding + off) + "px";
        });

        // Turn cursor into pointer while hovering link with pressed shift
        this.cm.getWrapperElement().addEventListener('mousemove', e => {
            t = $(e.target);//e.target.classList.contains("cm-url");
            if(t.hasClass('cm-url') && e.shiftKey) {
                t.addClass('shift');
            } else {
                t.removeClass('shift');
            }
        });

        this.cm.getWrapperElement().addEventListener('click', e => {
            if(e.shiftKey) {
                // Now we're handling
                e.preventDefault();
                e.stopPropagation();
                $(e.target).removeClass('shift');
                url = $(e.target).text();
                require('electron').shell.openExternal(url);
            }
        });

        this.cm.refresh();
    }; // END INIT()

    this.runCommand = function(cmd) {
        if(cmd == 'copy' || cmd == 'paste' || cmd == 'cut') {
            //this.cm.trigger(cmd)
            CodeMirror.signal(this.cm, cmd);
        } else {
            this.cm.execCommand(cmd);
        }
    };

    // Open a new file
    this.open = function(file) {
        if(this.currentHash != null) {
            console.log('Saving hash...', this.currentHash);
            let cr = this.cm.doc.getCursor();
            this.positions[this.currentHash] = {
                cursor: JSON.parse(JSON.stringify(cr)),
                scroll: $('.CodeMirror-scroll').offset()['top']
            };
        }

        this.cm.setValue(file.content);
        this.currentHash = 'hash' + file.hash;

        // Mark clean, because now we got a new (and therefore unmodified) file
        this.cm.markClean();
        this.cm.clearHistory(); // Clear history so that no "old" files can be
        // recreated using Cmd/Ctrl+Z.

        let curHash = this.currentHash;

        if(this.positions[curHash] !== undefined) {
            console.log('Reading hash information');
            this.cm.setCursor(this.positions[curHash].cursor);
            $('CodeMirror-scroll').scrollTop(this.positions[curHash].scroll);
        } else {
            // Default to start positions
            this.cm.doc.setCursor({line: 0, ch: 0});
            $('#CodeMirror-scroll').scrollTop(0);
        }
    };

    // This message is triggered by the renderer process when the user selects
    // the menu item.
    this.openFind = function() {
        // Persistent means the dialog does not hide.
        this.cm.execCommand("findPersistent");
    };

    // Close the current file
    this.close = function() {
        this.cm.setValue('');
        this.cm.markClean();
        this.cm.clearHistory();
    };

    this.getValue = function() {
        // Returns the current value. Will be called by ZettlrRenderer when the
        // user wants to save a file.
        return this.cm.getValue();
    };

    this.markClean = function() {
        this.cm.markClean();
    };

    this.toggleTheme = function() {
        if(this.div.hasClass('dark')) {
            this.div.removeClass('dark');
            this.cm.setOption("theme", 'zettlr');
        } else {
            this.div.addClass('dark');
            this.cm.setOption("theme", 'zettlr-dark');
        }
    };

    // Is the editor unmodified?
    this.isClean = function() {
        return this.cm.doc.isClean();
    };
}

module.exports = ZettlrEditor;
