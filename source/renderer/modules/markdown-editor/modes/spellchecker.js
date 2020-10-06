/* global CodeMirror define */
// ZETTLR SPELLCHECKER PLUGIN

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  var codeRE = /`.*?`/i
  var zknTagRE = /##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*^+~÷\\/|<=>[\](){}]+#?/i
  var footnoteRefRE = /\[\^[^\]]+\]/
  // NOTE: The whitespace after ~ are first a normal space, then an NBSP
  var delim = '!"#$%&()*+,-./:;<=>?@[\\]^_`{|}~  «»‹›„“”「」『』–—…÷‘’‚'

  /**
    * Define the spellchecker mode that will simply check all found words against
    * the renderer's typoCheck function.
    * @param  {Object} config    The original mode config
    * @param  {Object} parsercfg The parser config
    * @return {OverlayMode}           The generated overlay mode
    */
  CodeMirror.defineMode('spellchecker', function (config, parsercfg) {
    // word separators including special interpunction

    // Create the overlay and such
    var spellchecker = {
      token: function (stream) {
        var ch = stream.peek()
        var word = ''
        // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
        let ls = config.zettlr.zettelkasten.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
        let le = config.zettlr.zettelkasten.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input

        let zknLinkRE = new RegExp(ls + '.+?' + le)

        // Exclude zkn-links (because otherwise CodeMirror will create
        // multiple HTML elements _inside_ the link block, which will
        // render it way more difficult to extract the search terms.)
        if ((ls !== '') && stream.match(zknLinkRE)) {
          // Don't check on links if this is impossible
          return null
        }

        // Don't spellcheck tags
        if (stream.match(zknTagRE)) return null

        // Don't spellcheck inline code
        if (stream.match(codeRE)) return null

        // Don't spellcheck footnote references
        // to enable users to use named references
        // without breaking the preview.
        if (stream.match(footnoteRefRE)) return null

        if (delim.includes(ch)) {
          stream.next()
          return null
        }

        while ((ch = stream.peek()) != null && !delim.includes(ch)) {
          word += ch
          stream.next()
        }

        // Exclude numbers (even inside words) from spell checking
        // // Regex for whole numbers would be /^\d+$/
        if (/\d+/.test(word)) { return null }

        // Exclude links from spell checking as well
        if (/https?|www\./.test(word)) {
          // Let's eat the stream until the end of the link
          while ((stream.peek() != null) && (stream.peek() !== ' ')) {
            stream.next()
          }
          return null
        }

        // Prevent returning false results because of 'quoted' words.
        if (word[0] === "'") {
          word = word.substr(1)
        }
        if (word[word.length - 1] === "'") {
          word = word.substr(0, word.length - 1)
        }

        if (global.typo && !global.typo.check(word)) {
          return 'spell-error' // CSS class: cm-spell-error
        }

        return null
      }
    }

    let mode = CodeMirror.getMode(config, {
      name: 'markdown-zkn',
      highlightFormatting: true
    })
    return CodeMirror.overlayMode(mode, spellchecker, true)
  })
})
