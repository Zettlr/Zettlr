// This plugin renders GitHub Flavoured Markdown Task items

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../node_modules/codemirror/lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../../node_modules/codemirror/lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    var taskRE = /^- \[( |x)\] /g; // Matches `- [ ]` and `- [x]`
    var taskMarkers = [];

    CodeMirror.commands.markdownRenderTasks = function(cm) {
        let i = 0;
        let match;

        // First remove links that don't exist anymore. As soon as someone
        // moves the cursor into the link, it will be automatically removed,
        // as well as if someone simply deletes the whole line.
        do {
            if(!taskMarkers[i]) {
                continue;
            }
            if(taskMarkers[i] && taskMarkers[i].find() === undefined) {
                // Marker is no longer present, so splice it
                taskMarkers.splice(i, 1);
            } else {
                i++;
            }
        } while(i < taskMarkers.length);

        // Now render all potential new tasks
        for(let i = 0; i < cm.lineCount(); i++)
        {
            // Always reset lastIndex property, because test()-ing on regular
            // expressions advances it.
            taskRE.lastIndex = 0;

            // First get the line and test if the contents contain a link
            let line = cm.getLine(i);
            if((match = taskRE.exec(line)) == null) {
                continue;
            }

            if(cm.getCursor('from').line == i && cm.getCursor('from').ch < 6) {
                // We're directly in the formatting so don't render.
                continue;
            }

            let curFrom = { 'line': i, 'ch': 0};
            let curTo   = { 'line': i, 'ch': 5};

            let isRendered = false;
            let marks = cm.findMarks(curFrom, curTo);
            for(let marx of marks) {
                if(taskMarkers.includes(marx)) {
                    isRendered = true;
                    break;
                }
            }

            // Also in this case simply skip.
            if(isRendered) continue;

            // Now we can render it finally.
            let checked = (match[1] == 'x') ? true : false;

            let cbox = document.createElement('input');
            cbox.type = 'checkbox';
            if(checked) {
                cbox.checked = true;
            }

            let textMarker = cm.markText(
                curFrom, curTo,
                {
                    'clearOnEnter': true,
                    'replacedWith': cbox,
                    'inclusiveLeft': false,
                    'inclusiveRight': false
                }
            );

            cbox.onclick = (e) => {
                if (cm.getOption("disableInput")) return; // Don't do anything

                // Check or uncheck it
                // Check the checkbox, alter the underlying text and replace the
                // text marker in the list of checkboxes.
                let check = (cbox.checked) ? 'x' : ' ';
                cm.replaceRange(`- [${check}]`, curFrom, curTo);
                taskMarkers.splice(taskMarkers.indexOf(textMarker), 1);
                textMarker = cm.markText(
                    curFrom, curTo,
                    {
                        'clearOnEnter': true,
                        'replacedWith': cbox,
                        'inclusiveLeft': false,
                        'inclusiveRight': false
                    }
                );
                taskMarkers.push(textMarker);
            }

            taskMarkers.push(textMarker);
        }
    }

});
