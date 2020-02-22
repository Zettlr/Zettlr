/* global CodeMirror define */
// ZETTLR SPELLCHECKER PLUGIN

(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  var zknTagRE = /##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*^+~÷\\/|<=>[\](){}]+#?/i
  var headingRE = /(#+)\s+/
  var highlightRE = /::.+?::|==.+?==/
  var tableRE = /^\|.+\|$/i
  var inlineMathRE = /^(?:\$[^\s\\]\$(?!\d)|\$[^\s].*?[^\s\\]\$(?!\d))/
  var blockMathRE = /^\s*\$\$\s*$/

  /**
    * This defines the Markdown Zettelkasten system mode, which highlights IDs
    * and tags for easy use of linking and searching for files.
    * THIS MODE WILL AUTOMATICALLY LOAD THE SPELLCHECKER MODE WHICH WILL THEN
    * LOAD THE GFM MODE AS THE BACKING MODE.
    * @param  {Object} config       The config with which the mode was loaded
    * @param  {Object} parserConfig The previous config object
    * @return {OverlayMode}              The loaded overlay mode.
    */
  CodeMirror.defineMode('markdown-zkn', function (config, parserConfig) {
    var yamlMode = CodeMirror.getMode(config, 'yaml')
    var mdMode = CodeMirror.getMode(config, { name: 'gfm', highlightFormatting: true, gitHubSpice: false })

    var markdownZkn = {
      startState: function () {
        return {
          startOfFile: true,
          inFrontmatter: false,
          inEquation: false,
          inZknLink: false, // Whether or not we're currently within a zkn Link
          yamlState: CodeMirror.startState(yamlMode),
          mdState: CodeMirror.startState(mdMode)
        }
      },
      copyState: function (state) {
        return {
          startOfFile: state.startOfFile,
          inFrontmatter: state.inFrontmatter,
          inEquation: state.inEquation,
          inZknLink: state.inZknLink,
          // Make sure to correctly copy the YAML state
          yamlState: CodeMirror.copyState(yamlMode, state.yamlState),
          mdState: CodeMirror.copyState(mdMode, state.mdState)
        }
      },
      token: function (stream, state) {
        let le = config.zkn.linkEnd || ''
        if (le !== '' && state.inZknLink) {
          // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
          le = config.zkn.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
          le = new RegExp(le)
          if (stream.match(le)) {
            state.inZknLink = false
            return 'zkn-link-formatting'
          } else {
            stream.next()
            return 'zkn-link'
          }
        }

        if (state.startOfFile && stream.sol() && stream.match(/---/)) {
          // Assume a frontmatter
          state.startOfFile = false
          state.inFrontmatter = true
          return 'hr yaml-frontmatter-start'
        } else if (!state.startOfFile && state.inFrontmatter) {
          // Still in frontMatter?
          if (stream.sol() && stream.match(/---|\.\.\./)) {
            state.inFrontmatter = false
            return 'hr yaml-frontmatter-end'
          }

          // Continue to parse in YAML mode
          return yamlMode.token(stream, state.yamlState) + ' fenced-code'
        } else if (state.startOfFile) {
          // If no frontmatter was found, set the state to a desirable state
          state.startOfFile = false
        }

        // End possible block equations immediately
        // ATTENTION: We have to check for inEquation first, because
        // otherwise, stream.match() will ALWAYS be executed, hence
        // falsifying the otherwise correct else-if!!
        if (stream.sol() && !state.inEquation && stream.match(blockMathRE)) {
          // We have a multiline equation
          state.inEquation = true
          return 'fenced-code'
        } else if (stream.sol() && state.inEquation && stream.match(blockMathRE)) {
          // We're leaving the multiline equation
          state.inEquation = false
          return 'fenced-code'
        }

        // // While we're in an equation, simply return fenced-codes
        if (state.inEquation) {
          stream.skipToEnd()
          return 'fenced-code'
        }

        // Now let's check for inline equations
        if (stream.match(inlineMathRE, false)) {
          // Test for possible backspaces
          if (!stream.sol() && stream.backUp(1) === undefined && stream.next() !== '\\') {
            stream.match(inlineMathRE)
            return 'fenced-code'
          }
        }

        // Immediately check for escape characters
        // Escape characters need to be greyed out, but not the characters themselves.
        if (stream.peek() === '\\') {
          stream.next()
          return 'escape-char'
        }

        // Implement highlighting
        if (stream.match(highlightRE)) return 'highlight'

        // Now dig deeper for more tokens
        let zknIDRE = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('idRE')) {
          zknIDRE = new RegExp(config.zkn.idRE)
        }

        // This mode should also handle tables, b/c they are rather simple to detect.
        if (stream.sol() && stream.match(tableRE, false)) {
          // Got a table line -> skip to end and convert to table
          stream.skipToEnd()
          return 'table'
        }

        // Next on are tags in the form of #hashtag. We have to check for
        // headings first, as the tagRE will also match these, but they are not
        // real tags, so we need to hand them over to the mdMode.
        if (stream.match(headingRE, false)) {
          return mdMode.token(stream, state.mdState)
        } else if (stream.match(zknTagRE, false)) {
          // Two possibilities: sol, which will definitely be a tag, because
          // the headingRE did not match. Otherwise, not SOL, in which case we
          // need to check that the tag is preceeded by a space.
          if (stream.sol()) {
            stream.match(zknTagRE)
            return 'zkn-tag'
          } else {
            stream.backUp(1)
            if (stream.next() === ' ') {
              stream.match(zknTagRE)
              return 'zkn-tag'
            } else {
              return mdMode.token(stream, state.mdState)
            }
          }
        }

        let ls = config.zkn.linkStart || ''
        if (ls !== '') {
          ls = config.zkn.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
          ls = new RegExp(ls)
        }

        // Now check for a zknLink
        if ((ls !== '') && stream.match(ls)) {
          state.inZknLink = true
          return 'zkn-link-formatting'
        }

        // Third: IDs (The upside of this is that IDs _inside_ links will
        // be treated as _links_ and not as "THE" ID of the file as long
        // as the definition of zlkn-links is above this matcher.)
        if ((zknIDRE !== '') && stream.match(zknIDRE)) {
          return 'zkn-id'
        }

        return mdMode.token(stream, state.mdState)
      },
      innerMode: function (state) {
        // We need to return the correct mode so that
        // other plugins such as AutoCorrect don't
        // trigger in YAML mode as these inspect the
        // mode object.
        return {
          'mode': (state.inFrontmatter) ? yamlMode : markdownZkn,
          'state': (state.inFrontmatter) ? state.yamlState : state
        }
      },
      blankLine: function (state) {
        state.inZknLink = false
        // The underlying mode needs
        // to be aware of blank lines
        return mdMode.blankLine(state.mdState)
      }
    }

    return markdownZkn // CodeMirror.overlayMode(CodeMirror.getMode(config, 'spellchecker'), markdownZkn, true)
  })

  CodeMirror.defineMIME('text/x-zkn', 'markdown-zkn')
})
