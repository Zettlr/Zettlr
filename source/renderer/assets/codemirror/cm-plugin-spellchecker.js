// ZETTLR SPELLCHECKER PLUGIN


//
// Thanks to both for providing me with this stuff!

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
    mod(require("../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
    define(["../../lib/codemirror"], mod);
    else // Plain browser env
    mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    CodeMirror.defineMode("spellchecker", function(config, parsercfg) {
        // word separators
        var delim = "!\"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ ";


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

                // Exclude numbers from spell checking
                if(/^\d+$/.test(word)) {
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
