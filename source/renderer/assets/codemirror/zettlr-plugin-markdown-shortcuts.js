// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This plugin defines shortcuts for CodeMirror Markdown (Bold, italic, link, etc)

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../node_modules/codemirror/lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../../node_modules/codemirror/lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    var listRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
    emptyListRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
    unorderedListRE = /(\s*)([*+-])\s/,
    orderedListRE = /^(\s*)((\d+)([.)]))(\s*)/;

    var boldRE = /^(\*{2}(.*)\*{2}|\_{2}(.*)\_{2})$/;
    var italRE = /^(\*{1}(.*)\*{1}|\_{1}(.*)\_{1})$/;

    // Either encapsulates the selection bold or "un-bolds" or inserts new
    // Bold-characters
    CodeMirror.commands.markdownBold = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // Retrieve currently selected selections
        var sel = cm.doc.getSelections();

        // Is something selected?
        if(sel.length == 0) {
            // No, so just insert something at cursor -> ****
            cur = cm.doc.getCursor('from'); // Get beginning
            // Now ch contains the cursor char and line the corresponding line.
            // Replace the selection
            cm.doc.replaceSelection('****');
            // And then move the cursor two chars back (to place it in the
            // middle of the boldened)
            cur.ch = cur.ch - 2;
            cm.doc.setCursor(cur);
            return;
        }

        // Traverse all selections and perform bolden or unbolden on them
        for(let i = 0; i < sel.length; i++) {
            if(boldRE.test(sel[i])) {
                // We got bold so un-bolden.
                sel[i] = sel[i].substr(2, sel[i].length - 4);
            } else {
                // TODO: Check whether the user just selected the text itself and
                // not the formatting marks!
                // We got no bold so bolden
                sel[i] = "**" + sel[i] + "**";
            }
        }

        // Replace with changes selections
        cm.doc.replaceSelections(sel, 'around');
    };

    // The same for italic
    CodeMirror.commands.markdownItalic = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // Retrieve currently selected selections
        var sel = cm.doc.getSelections();

        // Is something selected?
        if(sel.length == 0) {
            // No, so just insert something at cursor
            cur = cm.doc.getCursor('from'); // Get beginning
            // Now ch contains the cursor char and line the corresponding line.
            // Replace the selection
            cm.doc.replaceSelection('__');
            // And then move the cursor one char back
            cur.ch = cur.ch - 1;
            cm.doc.setCursor(cur);
            return;
        }

        // Traverse all selections and perform bolden or unbolden on them
        for(let i = 0; i < sel.length; i++) {
            if(italRE.test(sel[i])) {
                // We got italic so un-emphasize.
                sel[i] = sel[i].substr(1, sel[i].length - 2);
            } else {
                // TODO: Check whether the user just selected the text itself and
                // not the formatting marks!
                // We got no italics so emphasize
                sel[i] = "_" + sel[i] + "_";
            }
        }

        // Replace with changes selections
        cm.doc.replaceSelections(sel, 'around');
    };

    // Inserts a link template
    CodeMirror.commands.markdownLink = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // Retrieve currently selected selections
        var sel = cm.doc.getSelections();

        // Is something selected?
        if(sel.length == 0) {
            cur = cm.doc.getCursor('from');
            cm.doc.replaceSelection('[]()');
            cur.ch = cur.ch - 3;
            cm.doc.setCursor(cur);
            return;
        }

        // Traverse all selections and perform bolden or unbolden on them
        for(let i = 0; i < sel.length; i++) {
            // We don't need regular expressions here because we will
            // just transform the text into a Link that has to be provided with
            // an URL
            sel[i] = "[" + sel[i] + "]()";
        }

        // Replace with changes selections
        cm.doc.replaceSelections(sel);
    };

    // Inserts image template
    CodeMirror.commands.markdownImage = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // Retrieve currently selected selections
        var sel = cm.doc.getSelections();

        // Is something selected?
        if(sel.length == 0) {
            cur = cm.doc.getCursor('from');
            cm.doc.replaceSelection('![]()');
            cur.ch = cur.ch - 3;
            cm.doc.setCursor(cur);
            return;
        }

        // Traverse all selections and perform bolden or unbolden on them
        for(let i = 0; i < sel.length; i++) {
            // We don't need regular expressions here because we will
            // just transform the text into a Link that has to be provided with
            // an URL
            sel[i] = "![" + sel[i] + "]()";
        }

        // Replace with changes selections
        cm.doc.replaceSelections(sel);
    };

    // Create or uncreate an ordered list
    CodeMirror.commands.markdownMakeOrderedList = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // If nothing is selected we have a very short journey.
        if(!cm.somethingSelected()) {
            // Just jump to the beginning of the line and insert a list indicator
            let cur = cm.getCursor();
            cur.ch = 0;
            cm.setCursor(cur);
            let line = cm.doc.getLineHandle(cur.line);
            if(orderedListRE.test(line.text)) {
                // Line is already ordered -> remove
                cm.doc.setSelection(cur, {'line': cur.line, 'ch': line.text.length});
                cm.doc.replaceSelection(cm.doc.getSelection().replace(orderedListRE, ''));
            } else {
                // Line is not a list -> find out whether the previous line is a list
                let num = 1;
                let olSep = '.';
                let olTab = '';
                if(cur.line > 0) {
                    let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line-1).text);
                    if(match) {
                        // Third capturing group is the actual number
                        num = parseInt(match[3]) + 1;
                        olSep = match[4]; // 4 is either . or )
                        olTab = match[1]; // Contains the spaces (i.e. the tab position)
                    }
                }
                cm.doc.replaceRange(olTab + num + olSep + ' ', cur);
            }
            return;
        }

        // Now traverse each selections and either apply a listing or remove it
        for(let sel of cm.doc.getSelections()) {
            if(sel.indexOf('\n') > -1) {
                // First get the beginning cursor position (anchor)
                let cur = cm.doc.getCursor('from');
                let lineFrom = cur.line;
                // Second get the ending cursor position (head)
                let lineTo = cm.doc.getCursor('to').line + 1; // eachLine will exclude the lineTo line
                // Third traverse each line between both positions and add
                // numbers to them.

                let itemNo = 1;
                let olSep = '.';
                let olTab = '';
                if(cur.line > 0) {
                    // Remember to get a (potential) previous number.
                    let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line-1).text);
                    if(match) {
                        // Third capturing group is the actual number
                        itemNo = parseInt(match[3]) + 1;
                        olSep = match[4];
                        olTab = match[1];
                    }
                }
                cm.doc.eachLine(lineFrom, lineTo, (line) => {
                    let no = line.lineNo();
                    if(orderedListRE.test(line.text)) {
                        // Line is already ordered -> remove
                        cm.doc.setCursor(no, 0);
                        let curFrom = cm.doc.getCursor();
                        cm.doc.setSelection(curFrom, { 'line':no, 'ch':line.text.length});
                        cm.doc.replaceSelection(cm.doc.getSelection().replace(orderedListRE, ''));
                    } else {
                        // Just prepend item numbers
                        cm.doc.setCursor(no, 0);
                        cm.doc.replaceRange(olTab + (itemNo++) + olSep + ' ', cm.doc.getCursor());
                    }
                });
            } else {
                let cur = cm.doc.getCursor();
                cur.ch = 0;
                cm.doc.setCursor(cur);
                let num = 1;
                let olSep = '.';
                let olTab = '';
                if(cur.line > 0) {
                    let match = orderedListRE.exec(cm.doc.getLineHandle(cur.line-1).text);
                    if(match) {
                        // Third capturing group is the actual number
                        num = parseInt(match[3]) + 1;
                        olSep = match[4]; // 4 is either . or )
                        olTab = match[1]; // The prepending spaces
                    }
                }
                cm.doc.replaceRange(olTab + num + olSep + ' ', cur); // Only prepend a number
            }
        }
    };

    // Create or uncreate an unordered list
    CodeMirror.commands.markdownMakeUnorderedList = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // If nothing is selected we have a very short journey.
        if(!cm.somethingSelected()) {
            // Just jump to the beginning of the line and insert a list indicator
            let cur = cm.getCursor();
            cur.ch = 0;
            cm.setCursor(cur);
            let line = cm.doc.getLineHandle(cur.line);
            if(unorderedListRE.test(line.text)) {
                // Line is already unordered -> remove
                cm.doc.setSelection(cur, {'line': cur.line, 'ch': line.text.length});
                cm.doc.replaceSelection(cm.doc.getSelection().replace(unorderedListRE, ''));
            } else {
                // Line is not a list -> Insert a bullet at cursor position
                let num = '*';
                let olTab = '';
                if(cur.line > 0) {
                    let match = unorderedListRE.exec(cm.doc.getLineHandle(cur.line-1).text);
                    if(match) {
                        console.log(match);
                        // Third capturing group is the bullet char
                        num = match[2];
                        olTab = match[1]; // Contains the spaces (i.e. the tab position)
                    }
                }
                cm.doc.replaceRange(olTab + num + ' ', cur);
            }
            return;
        }

        // Now traverse each selections and either apply a listing or remove it
        for(let sel of cm.doc.getSelections()) {
            if(sel.indexOf('\n') > -1) {
                // First get the beginning cursor position (anchor)
                let lineFrom = cm.doc.getCursor('from').line;
                // Second get the ending cursor position (head)
                let lineTo = cm.doc.getCursor('to').line + 1; // eachLine will exclude the lineTo line
                // Third traverse each line between both positions and add
                // bullets to them
                cm.doc.eachLine(lineFrom, lineTo, (line) => {
                    let no = line.lineNo();
                    if(unorderedListRE.test(line.text)) {
                        // Line is already unordered -> remove
                        cm.doc.setCursor(no, 0);
                        let curFrom = cm.doc.getCursor();
                        cm.doc.setSelection(curFrom, { 'line':no, 'ch':line.text.length});
                        cm.doc.replaceSelection(cm.doc.getSelection().replace(unorderedListRE, ''));
                    } else {
                        // Just prepend bullets
                        cm.doc.setCursor(no, 0);
                        cm.doc.replaceRange('* ', cm.doc.getCursor());
                    }
                });
            } else {
                let cur = cm.doc.getCursor();
                cur.ch = 0;
                cm.doc.setCursor(cur);
                let num = '*';
                let olTab = '';
                if(cur.line > 0) {
                    let match = unorderedListRE.exec(cm.doc.getLineHandle(cur.line-1).text);
                    if(match) {
                        // Third capturing group is the bullet char
                        num = match[2];
                        olTab = match[1]; // Contains the spaces (i.e. the tab position)
                    }
                }
                cm.doc.replaceRange(olTab + num + ' ', cur);
            }
        }
    };

});
