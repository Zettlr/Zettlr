/* global CodeMirror define */
// This plugin renders iFrames in CodeMirror instances

const { getIframeRE } = require('../../../regular-expressions');

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

  const iframeRE = getIframeRE() // Matches all iframes

  CodeMirror.commands.markdownRenderIframes = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if ((match = iframeRE.exec(line)) == null) {
        continue
      }

      if (cm.getCursor('from').line === i) {
        // We're directly in the formatting so don't render.
        continue
      }

      let curFrom = { 'line': i, 'ch': 0 }
      let curTo = { 'line': i, 'ch': match[0].length }

      // We can only have one marker at any given position at any given time
      if (cm.doc.findMarks(curFrom, curTo).length > 0) continue

      // Now we can render it finally. For this we need to convert it into an
      // actual DOM node. We'll do this by rendering it as the innerHTML of a
      // DIV element, from which we then take the firstChild.
      let wrapper = document.createElement('div')
      wrapper.innerHTML = match[0]

      cm.doc.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': wrapper.firstChild,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )
    }
  }
})
