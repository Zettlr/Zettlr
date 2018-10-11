/* global CodeMirror $ define */
// This plugin renders MathJax parts in CodeMirror instances

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

  var mathRE = /^\$\$(.+?)\$\$$|\$(.+?)\$/g // Matches all math blocks and inlines
  var mathMarkers = []

  CodeMirror.commands.markdownRenderMath = function (cm) {
    let i = 0
    let match

    // First remove iFrames that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!mathMarkers[i]) {
        continue
      }
      if (mathMarkers[i] && mathMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        mathMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < mathMarkers.length)

    // Now render all potential new Math elements
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // First get the line and test if the contents contain a math element
      let line = cm.getLine(i)
      if ((match = mathRE.exec(line)) == null) {
        continue
      }

      if (cm.getCursor('from').line === i) {
        // We're directly in the formatting so don't render.
        continue
      }

      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + match[0].length }

      let isRendered = false
      let marks = cm.findMarks(curFrom, curTo)
      for (let marx of marks) {
        if (mathMarkers.includes(marx)) {
          isRendered = true
          break
        }
      }

      // Also in this case simply skip.
      if (isRendered) continue

      // Use jQuery for simple creation of the DOM element
      let elem = $(`<span class="preview-math"></span>`)[0]

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': elem,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      // It's match[2] if it was inline.
      require('katex').render(match[1] || match[2], elem, {
        throwOnError: false
      })
      textMarker.changed()

      mathMarkers.push(textMarker)
    }
  }
})
