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

    var zkndelim = "!\"$%&()*+,/:;<=>?@[\\]^`{|}~ «»“”–—…÷‘’‚"; // Some less zkn delims
    var delim = "!\"#$%&()*+,-./:;<=>?@[\\]^_`{|}~ «»“”–—…÷‘’‚";
    var zknLinkRE = /\[\[(.*?)\]\]/;

    /**
     * Define the spellchecker mode that will simply check all found words against
     * the renderer's typoCheck function.
     * @param  {Object} config    The original mode config
     * @param  {Object} parsercfg The parser config
     * @return {OverlayMode}           The generated overlay mode
     */
    CodeMirror.defineMode("spellchecker", function(config, parsercfg) {
        // word separators including special interpunction

        // Create the overlay and such
        var spellchecker = {
            token: function(stream) {
                var ch = stream.peek();
                var word = "";

                // Exclude zkn-links (because otherwise CodeMirror will create
                // multiple HTML elements _inside_ the link block, which will
                // render it way more difficult to extract the search terms.)
                if (stream.match(zknLinkRE)) {
                    return null;
                }

                if (ch == '#') {
                    stream.next();
                    if(![' ', '#'].includes(stream.peek())) {
                        // We've got a tag so skip spell checking
                        while(!/\s/.test(ch) && ch != null) {
                            ch = stream.next();
                        }
                        return null;
                    }
                }

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
                if(/\d+/.test(word)) { return null; }

                // Exclude links from spell checking as well
                if(/https?|www\./.test(word)) {
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
        return CodeMirror.overlayMode(mode, spellchecker, true);
    });

    /**
     * This defines the Markdown Zettelkasten system mode, which highlights IDs
     * and tags for easy use of linking and searching for files.
     * THIS MODE WILL AUTOMATICALLY LOAD THE SPELLCHECKER MODE WHICH WILL THEN
     * LOAD THE GFM MODE AS THE BACKING MODE.
     * @param  {Object} config       The config with which the mode was loaded
     * @param  {Object} parserConfig The previous config object
     * @return {OverlayMode}              The loaded overlay mode.
     */
    CodeMirror.defineMode("markdown-zkn", function(config, parserConfig) {

        var markdownZkn = {
            token: function(stream, state) {
                var ch;

                // First: Tags, in the format of Twitter
                if (stream.match('#')) {
                    if([' ', '#'].includes(stream.peek()) // We've just unraveled a heading.
                        || zkndelim.includes(stream.peek())) { // This means # is followed by a delim
                        stream.next();
                        return null;
                    }
                    let chars = 0;
                    while ((ch = stream.next()) != null) {
                        if (zkndelim.includes(ch) && chars > 1) {
                            stream.backUp(1); // Go one back
                            return "zkn-tag";
                        }
                        chars++;
                    }

                    if(stream.eol() && chars > 0) {
                        return "zkn-tag";
                    }
                }

                // Second: zkn links. This is MUCH easier than I thought :o
                if (stream.match(zknLinkRE)) {
                    return "zkn-link";
                }

                // Third: IDs (The upside of this is that IDs _inside_ links will
                // be treated as _links_ and not as "THE" ID of the file as long
                // as the definition of zlkn-links is above this matcher.)
                if(stream.match('@ID:')) {
                    let chars = 0;
                    while((ch = stream.next()) != null) {
                        if (zkndelim.includes(ch) && chars > 1) {
                            stream.backUp(1); // Go one back
                            return "zkn-id";
                        }
                        chars++;
                    }

                    if(stream.eol() && chars > 0) {
                        return "zkn-id";
                    }
                }

                // Progress until another match.
                while (stream.next() != null
                && !stream.match("#", false)
                && !stream.match('@ID:', false)
                && !stream.match('[[', false)) {}

                return null;
            }
        };

        let mode = CodeMirror.getMode(config, {
            name: "spellchecker",
            highlightFormatting: true
        });
        return CodeMirror.overlayMode(mode, markdownZkn, true);
    });
});
