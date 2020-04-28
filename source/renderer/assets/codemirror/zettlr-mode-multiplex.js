/* global CodeMirror define */
// ZETTLR SPELLCHECKER PLUGIN

const highlightingModes = require('../../../common/data').highlightingModes;

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

  /**
  * MULTIPLEX MODE: This will by default load our internal mode cascade
  * (consisting of the zkn-mode, the spellchecker and finally the gfm
  * mode) OR in code blocks use the respective highlighting modes.
  * @param  {Object} config The previous configuration object
  * @return {CodeMirrorMode}        The multiplex mode
  */
  CodeMirror.defineMode('multiplex', function (config) {
    // Generate a fenced code tag detector for each mode we want to support
    let codeModes = []

    for (let [ mimeType, highlightingMode ] of Object.entries(highlightingModes)) {
      let openRegex = new RegExp('```\\s*(' + highlightingMode.selectors.join('|') + ')\\b.*$')
      codeModes.push({
        open: openRegex,
        close: '```',
        mode: CodeMirror.getMode(config, mimeType),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      })
    }

    return CodeMirror.multiplexingMode(
      CodeMirror.getMode(config, 'spellchecker'), // Default mode
      ...codeModes,
      {
        open: '```',
        close: '```',
        mode: CodeMirror.getMode(config, 'text/plain'),
        delimStyle: 'formatting-code-block',
        innerStyle: 'fenced-code'
      }
    )
  })
})
