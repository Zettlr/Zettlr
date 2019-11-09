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
  var highlightRE = /::.+?::|==.+?==/
  var tableRE = /^\|.+\|$/i

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

    var markdownZkn = {
      startState: function () {
        return {
          startOfFile: true,
          inFrontmatter: false,
          yamlState: CodeMirror.startState(yamlMode)
        }
      },
      copyState: function (state) {
        return {
          startOfFile: state.startOfFile,
          inFrontmatter: state.inFrontmatter,
          // Make sure to correctly copy the YAML state
          yamlState: CodeMirror.copyState(yamlMode, state.yamlState)
        }
      },
      token: function (stream, state) {
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
          return yamlMode.token(stream, state) + ' fenced-code'
        } else if (state.startOfFile) {
          // If no frontmatter was found, set the state to a desirable state
          state.startOfFile = false
        }

        // Immediately check for escape characters
        // Escape characters need to be greyed out, but not the characters themselves.
        if (stream.peek() === '\\') {
          stream.next()
          return 'escape-char'
        }

        // Implement highlighting
        if (stream.match(highlightRE)) {
          return 'highlight'
        }

        // Now dig deeper for more tokens
        let zknIDRE = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('idRE')) {
          zknIDRE = new RegExp(config.zkn.idRE)
        }
        let ls = ''
        let le = ''
        if (config.hasOwnProperty('zkn') && config.zkn.hasOwnProperty('linkStart') && config.zkn.hasOwnProperty('linkEnd')) {
          // Regex replacer taken from https://stackoverflow.com/a/6969486 (thanks!)
          ls = config.zkn.linkStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
          le = config.zkn.linkEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') // Escape raw user input
        }
        let zknLinkRE = new RegExp(ls + '.+?' + le)

        // This mode should also handle tables, b/c they are rather simple to detect.
        if (stream.sol() && stream.match(tableRE, false)) {
          // Got a table line -> skip to end and convert to table
          stream.skipToEnd()
          return 'table'
        }

        // First: Tags, in the format of Twitter
        if (stream.match(zknTagRE, false)) {
          // As lookbehinds and other nice inventions of regular expressions
          // won't work here because it is a stream of characters rather than
          // one long string, we have to manually check that the tag can be
          // rendered as such. The only way where this should happen is, if the
          // tag is either on a newline or preceeded by a space. This is why we
          // don't have to manually check for escape characters - as these are
          // no spaces, they'll also match our if-condition below.
          if (!stream.sol()) {
            stream.backUp(1)
            if (stream.next() !== ' ') {
              stream.match(zknTagRE)
              return null
            }
          }

          // At this point we can be sure that this is a tag and not escaped.
          stream.match(zknTagRE)
          return 'zkn-tag'
        }

        // Second: zkn links. This is MUCH easier than I thought :o
        if ((le !== '') && stream.match(zknLinkRE)) {
          return 'zkn-link'
        }

        // Third: IDs (The upside of this is that IDs _inside_ links will
        // be treated as _links_ and not as "THE" ID of the file as long
        // as the definition of zlkn-links is above this matcher.)
        if ((zknIDRE !== '') && stream.match(zknIDRE)) {
          return 'zkn-id'
        }

        // Progress until another match.
        while (stream.next() != null &&
                !stream.match(zknTagRE, false) &&
                !stream.match(zknIDRE, false) &&
                !stream.match(zknLinkRE, false) &&
                !stream.match(highlightRE, false) &&
                !stream.match(/\\/, false)) { }

        return null
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
      }
    }

    return CodeMirror.overlayMode(CodeMirror.getMode(config, 'spellchecker'), markdownZkn, true)
  })
})
