// This plugin renders markdown inline links

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../node_modules/codemirror/lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../../node_modules/codemirror/lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    var linkRE = /\[(.+?)\]\((.+?)\)|(https?:\/\/\S+|www\.\S+)/g; // Matches [Link](www.xyz.tld) and simple links
    var linkMarkers = [];


    CodeMirror.commands.markdownRenderLinks = function(cm) {
        let i = 0;
        let match;

        // First remove links that don't exist anymore. As soon as someone
        // moves the cursor into the link, it will be automatically removed,
        // as well as if someone simply deletes the whole line.
        do {
            if(!linkMarkers[i]) {
                continue;
            }
            if(linkMarkers[i] && linkMarkers[i].find() === undefined) {
                // Marker is no longer present, so splice it
                linkMarkers.splice(i, 1);
            } else {
                i++;
            }
        } while(i < linkMarkers.length);

        // Now render all potential new links
        for(let i = 0; i < cm.lineCount(); i++)
        {
            // Always reset lastIndex property, because test()-ing on regular
            // expressions advance it.
            linkRE.lastIndex = 0;

            // First get the line and test if the contents contain a link
            let line = cm.getLine(i);
            if(!linkRE.test(line)) {
                continue;
            }

            linkRE.lastIndex = 0; // Necessary because of global flag in RegExp

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

                let cur = cm.getCursor('from');
                if(cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
                    // Cursor is in selection: Do not render.
                    continue;
                }

                // Has this thing already been rendered?
                let con = false;
                let marks = cm.findMarks(curFrom, curTo);
                for(let marx of marks) {
                    if(linkMarkers.includes(marx)) {
                        // We've got communism. (Sorry for the REALLY bad pun.)
                        con = true;
                        break;
                    }
                }
                if(con) continue; // Skip this match

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
                let textMarker = cm.markText(
                    curFrom, curTo,
                    {
                        'clearOnEnter': true,
                        'replacedWith': a,
                        'inclusiveLeft': false,
                        'inclusiveRight': false
                    }
                );

                a.onclick = (e) => {
                    // Only open ALT-clicks (Doesn't select and also is not used
                    // elsewhere)
                    if(e.altKey) {
                        e.preventDefault();
                        require('electron').shell.openExternal(url);
                    } else {
                        // Clear the textmarker and set the cursor to where the
                        // user has clicked the link.
                        textMarker.clear();
                        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }));
                        cm.focus();
                    }
                };

                linkMarkers.push(textMarker);
            }
        }
    }

});
