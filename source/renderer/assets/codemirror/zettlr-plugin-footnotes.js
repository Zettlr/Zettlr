// Insert and edit markdown footnotes

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    var fnRE =          /\[\^(\d+)\][^:]/g;     // group 1: footnote number
    var fninlineRE =    /.*?\[\^(\d+)\].*?/;    // group 1: footnote number
    var fnexactRE =     /^\[\^\d+\]$/;          // No matching group.
    var fnrefRE =       /^\[\^(\d+)\]: (.+)/gm; // group 1: footnote number; group 2: text
    var fnrefsingleRE = /^\[\^(\d+)\]: (.+)/;   // Single line reference group

    // Inserts a footnote
    CodeMirror.commands.insertFootnote = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        let cur = cm.doc.getCursor();

        if(fnrefRE.test(cm.doc.getLine(cur.line))) {
            // Let's try to keep inception with fns inside other fns to a minimum.
            return;
        }

        let content = cm.doc.getValue();

        // Find all footnotes
        let lastIndex = 0; // Start with 0 because the index WILL be increased.
        let match = [];

        while((match = fnRE.exec(content)) !== null) {
            // Find the highest index
            if(parseInt(match[1]) > lastIndex) {
                lastIndex = parseInt(match[1]);
            }
        }

        lastIndex++;

        cm.doc.replaceRange(`[^${lastIndex}]`, cur);
        // Also, add a reference to the bottom of the document
        cur.line = cm.doc.lastLine();
        cur.ch = cm.doc.getLine(cur.line).length;
        cm.doc.setCursor(cur);
        let nl = '\n\n';
        // Check if the last line is either empty or contains a footnote
        if(cur.line > 0) {
            let line = cm.doc.getLine(cur.line);
            if(fnrefRE.test(line) || line.trim() === '') {
                nl = '\n'; // Only one newline char.
            }
        }
        cm.doc.replaceRange(`${nl}[^${lastIndex}]: `, cur);
    };

    // Removes a footnote
    CodeMirror.commands.removeFootnote = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        let curTo = cm.doc.getCursor();

        // First select the whole footnote
        let curFrom = { 'line': curTo.line, 'ch': curTo.ch };
        let emergencyStop = 30; // If your footnote number increases this, you're mad

        // Step one: Find the beginning
        do {
            curFrom.ch = curFrom.ch - 1;
            cm.doc.setSelection(curFrom, curTo);
            if(--emergencyStop < 0) {
                // Prevent infinite loop
                break;
            }
        } while(cm.doc.getSelection().indexOf('[') !== 0);

        emergencyStop = 30;
        // Now we either have nothing because the loop stopped or the beginning.
        do {
            curTo.ch = curTo.ch + 1;
            cm.doc.setSelection(curFrom, curTo);
            if(--emergencyStop < 0) {
                // Prevent infinite loop
                break;
            }
        } while(!fnexactRE.test(cm.doc.getSelection()));

        // Either we got the complete footnote or again an error. So let's test
        if(fnexactRE.test(cm.doc.getSelection())) {
            // Okay, we've got a footnote selected.
            let fn = fninlineRE.exec(cm.doc.getSelection())[1]; // The number

            // Remove the footnote
            cm.doc.replaceSelection('');

            // Now from the end of the document try to find the respective
            // reference and remove the whole line.
            for(let lineNo = cm.doc.lastLine(); lineNo > -1; lineNo--) {
                let match = fnrefsingleRE.exec(cm.doc.getLine(lineNo));
                if(match && (match[1] === fn)) {
                    // Remove the line
                    cm.doc.setCursor({ 'line': lineNo, 'ch': 0});
                    cm.execCommand('deleteLine');
                    // Reset the cursor to the initial beginning
                    cm.doc.setCursor(curFrom);
                    // We are done here.
                    break;
                }
            }
        }
    };

    // Re-order all footnotes with ascending numbers.
    // TODO: This shit is currently really messed up. I don't know why this
    // function does what it does but it looks funny.
    //
    // Wanna have some fun? Open the console and type
    // renderer.editor.cm.execCommand('beautifyFootnotes')
    // I'm not kidding, it's a mess.
    CodeMirror.commands.beautifyFootnotes = function(cm) {
        if (cm.getOption("disableInput")) return CodeMirror.Pass;

        // Save for later
        let oldCursor = cm.doc.getCursor();

        let content = cm.doc.getValue();

        // First find the highest index
        let highIndex = 0;
        let match = [];

        while((match = fnRE.exec(content)) !== null) {
            // Find the highest index
            if(parseInt(match[1]) > highIndex) {
                highIndex = parseInt(match[1]);
            }
        }

        highIndex++;

        // Now replace ALL footnotes including their references with the higher
        // indices
        let anchor = { 'line': 0, 'ch': 0 };
        let head   = { 'line': 0, 'ch': 0 };

        cm.eachLine((lineHandle) => {
            if(fnRE.test(lineHandle.text)) {
                // There's at least one footnote.
                anchor.line = lineHandle.lineNo();
                head.line = lineHandle.lineNo();
                let match = [];
                while((match = fnRE.exec(lineHandle.text)) !== null) {
                    let curIndex = match[1];
                    anchor.ch = lineHandle.text.indexOf(match[0]);
                    head.ch = anchor.ch + match[0].length - 1;
                    cm.doc.setSelection(anchor, head);
                    console.log(`*FOOTNOTE ${match[0]} with [^${highIndex}]…`);
                    cm.doc.replaceSelection(`[^${highIndex}]`);
                    // Now find the corresponding reference.
                    for(let lineNo = cm.doc.lastLine(); lineNo > -1; lineNo--) {
                        let match = fnrefsingleRE.exec(cm.doc.getLine(lineNo));
                        if(match && (match[1] === curIndex)) {
                            // Replace the corresponding reference
                            anchor.line = lineNo;
                            head.line = lineNo;
                            anchor.ch = 0;
                            head.ch = cm.doc.getLine(lineNo).indexOf(']') + 1; // first occurrence
                            cm.doc.setSelection(anchor, head);
                            console.log(`REFERENCE ${match[0]} with [^${highIndex}]`);
                            cm.doc.replaceSelection(`[^${highIndex}]`);
                            // Now next footnote.
                            highIndex++;
                            break;
                        }
                    }
                }
            }
        });

        console.log('*'.repeat(30));
        console.log('Switching ...');
        console.log('*'.repeat(30));

        // Now all footnotes are ordered ascending using the high index. Now
        // we just need to do this again using highIndex = 1 as starting point.
        highIndex = 1;
        cm.eachLine((lineHandle) => {
            if(fnRE.test(lineHandle.text)) {
                // There's at least one footnote.
                anchor.line = lineHandle.lineNo();
                head.line = lineHandle.lineNo();
                let match = [];
                while((match = fnRE.exec(lineHandle.text)) !== null) {
                    anchor.ch = lineHandle.text.indexOf(match[0]);
                    head.ch = anchor.ch + match[0].length - 1;
                    cm.doc.setSelection(anchor, head);
                    console.log(`Replacing ${match[0]} with [^${highIndex}]…`);
                    cm.doc.replaceSelection(`[^${highIndex}]`);
                    // Now find the corresponding reference.
                    for(let lineNo = cm.doc.lastLine(); lineNo > -1; lineNo--) {
                        let match = fnrefsingleRE.exec(cm.doc.getLine(lineNo));
                        if(match && (match[1] === highIndex)) {
                            // Replace the corresponding reference
                            anchor.line = lineNo;
                            head.line = lineNo;
                            anchor.ch = 0;
                            head.ch = cm.doc.getLine(lineNo).indexOf(']') + 1; // first occurrence
                            cm.doc.setSelection(anchor, head);
                            console.log(`REFERENCE ${match[0]} with [^${highIndex}]`);
                            cm.doc.replaceSelection(`[^${highIndex}]`);
                            // Now next footnote.
                            highIndex++;
                            break;
                        }
                    }
                }
            }
        });
        // At the end re-set the cursor to the old one.
        cm.doc.setCursor(oldCursor);
    };
});
