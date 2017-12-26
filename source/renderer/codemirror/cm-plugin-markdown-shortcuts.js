// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE
//
// This plugin defines shortcuts for CodeMirror Markdown (Bold, italic, link, etc)

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    var listRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/,
    emptyListRE = /^(\s*)(>[> ]*|[*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/,
    unorderedListRE = /[*+-]\s/;

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

    // TODO
    // Create or uncreate an ordered list
    CodeMirror.commands.markdownMakeOrderedList = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;
    };

    // Create or uncreate an unordered list
    CodeMirror.commands.markdownMakeUnorderedList = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;
    };

});
