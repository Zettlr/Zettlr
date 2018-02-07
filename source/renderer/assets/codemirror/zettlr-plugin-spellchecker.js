// ZETTLR SPELLCHECKER PLUGIN

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../../node_modules/codemirror/lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../../node_modules/codemirror/lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    CodeMirror.defineMode("spellchecker", function(config, parsercfg) {
        // word separators
        var delim = "!\"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ ";
        // Include special interpunction
        delim += "«»“”–—…÷‘’‚";


        // Create the overlay and such
        var overlay = {
            token: function(stream) {
                var ch = stream.peek();
                var word = "";

                if(delim.includes(ch)) {
                    stream.next();
                    return null;
                }

                while((ch = stream.peek()) != null && !delim.includes(ch)) {
                    word += ch;
                    stream.next();
                }

                // Exclude numbers (even inside words) from spell checking
                // // Regex for whole numbers would be /^\d+$/
                if(/\d+/.test(word)) {
                    return null;
                }

                // Exclude links from spell checking as well
                if(/https?/.test(word)) {
                    // Let's eat the stream until the end of the link
                    while((stream.peek() != null) && (stream.peek() != ' ')) {
                        stream.next();
                    }
                    return null;
                }

                if(window.renderer && !window.renderer.typoCheck(word)) {
                    return "spell-error"; // CSS class: cm-spell-error
                }

                return null;
            }
        };

        let mode = CodeMirror.getMode(config, {
            name: "gfm",
            highlightFormatting: true
        });
        return CodeMirror.overlayMode(mode, overlay, true);
    });
});
