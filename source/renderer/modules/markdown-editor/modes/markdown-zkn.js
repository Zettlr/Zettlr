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

  var zknTagRE = /##?[^\s,.:;…!?"'`»«“”‘’—–@$%&*#^+~÷\\/|<=>[\](){}]+#?/i
  var headingRE = /(#+)\s+/
  var highlightRE = /::.+?::|==.+?==/
  var tableRE = /^\|.+\|$/i
  var inlineMathRE = /^(?:\${1,2}[^\s\\]\${1,2}(?!\d)|\${1,2}[^\s].*?[^\s\\]\${1,2}(?!\d))/
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
          hasJustEscaped: false, // Whether the previous iteration had an escape char
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
          hasJustEscaped: state.hasJustEscaped,
          // Make sure to correctly copy the YAML state
          yamlState: CodeMirror.copyState(yamlMode, state.yamlState),
          mdState: CodeMirror.copyState(mdMode, state.mdState)
        }
      },
      token: function (stream, state) {
        // First: YAML highlighting. This block will only execute
        // at the beginning of a file.
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

        // Directly afterwards check for inline code or comments, so
        // that stuff such as zkn-links are not highlighted:
        if (state.mdState.overlay.code || state.mdState.overlay.codeBlock || state.mdState.baseCur === 'comment') {
          return mdMode.token(stream, state.mdState)
        }

        // In everything that follows, escpaing things is allowed and possible.
        // By immediately returning and checking right at the beginning of the
        // method, we can prevent other modes from triggering.
        if (stream.match('\\')) {
          if (!stream.eol()) {
            // Only set the escaped state if the backslash
            // did not occur at the end of a line
            state.hasJustEscaped = true
          }
          return 'escape-char'
        }

        // Then check if we have just escaped, and, if so, return an empty class
        // which will also (intentionally) break any rendering that the next()
        // char would have initiated.
        if (state.hasJustEscaped) {
          state.hasJustEscaped = false // Needs to be reset always
          if (!stream.eol()) {
            stream.next()
            return null // No highlighting for escaped characters
          } // Else: It might be sol(), but don't escape
        }

        // Then handle block equations.
        // NOTE: We have to check for inEquation first, because
        // otherwise, stream.match() will ALWAYS be executed, hence
        // falsifying the otherwise correct else-if!!
        if (stream.sol() && !state.inEquation && stream.match(blockMathRE)) {
          // We have a multiline equation
          state.inEquation = true
          return 'comment'
        } else if (stream.sol() && state.inEquation && stream.match(blockMathRE)) {
          // We're leaving the multiline equation
          state.inEquation = false
          return 'comment'
        } else if (state.inEquation) {
          // While we're in an equation, simply return fenced-codes.
          stream.skipToEnd()
          return 'comment'
        }

        // Fifth: Are we in a link?
        if (state.inZknLink) {
          if (stream.match(config.zettlr.zettelkasten.linkEnd)) {
            state.inZknLink = false
            return 'zkn-link-formatting'
          }

          while (!stream.eol() && !stream.match(config.zettlr.zettelkasten.linkEnd, false)) {
            stream.next()
          }
          return 'zkn-link'
        }

        // From here on there are only not-so-special things. Using the
        // hasJustEscaped-state, we can keep most things very simple.
        // None of the following has to explicitly check for backspaces.

        // Now let's check for inline equations
        if (stream.match(inlineMathRE)) return 'inline-math'

        // Implement highlighting
        if (stream.match(highlightRE)) return 'highlight'

        // Now dig deeper for more tokens

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

        // Now check for a zknLink
        if (stream.match(config.zettlr.zettelkasten.linkStart)) {
          state.inZknLink = true
          return 'zkn-link-formatting'
        }

        // IDs (The upside of this is that IDs _inside_ links will
        // be treated as _links_ and not as "THE" ID of the file as long
        // as the definition of zkn-links is above this matcher.)

        let zknIDRE = new RegExp(config.zettlr.zettelkasten.idRE)
        if (stream.match(zknIDRE)) return 'zkn-id'

        // If nothing has triggered until here, let the markdown
        // mode take over as it is responsible for everything else.
        return mdMode.token(stream, state.mdState)
      },
      innerMode: function (state) {
        // We need to return the correct mode so that
        // other plugins such as AutoCorrect don't
        // trigger in YAML mode as these inspect the
        // mode object.
        return {
          // 'mode': (state.inFrontmatter) ? yamlMode : markdownZkn,
          // 'state': (state.inFrontmatter) ? state.yamlState : state
          'mode': (state.inFrontmatter) ? yamlMode : mdMode,
          'state': (state.inFrontmatter) ? state.yamlState : state.mdState
        }
      },
      blankLine: function (state) {
        state.inZknLink = false
        state.hasJustEscaped = false
        state.inZknLink = false
        // The underlying mode needs
        // to be aware of blank lines
        return mdMode.blankLine(state.mdState)
      }
    }

    return markdownZkn
  })

  CodeMirror.defineMIME('text/x-zkn', 'markdown-zkn')
})
