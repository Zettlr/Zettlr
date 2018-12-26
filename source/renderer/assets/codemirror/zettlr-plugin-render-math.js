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

  // var mathRE = /^\$\$(.+?)\$\$$|\$(.+?)\$/g // Matches all math blocks and inlines
  var mathRE = /^\$\$(.+?[^\\])\$\$|(?<=[^\\])\$\$(.+?[^\\])\$\$/g // Matches all inlines with non-escaped double-dollar-signs.
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
      if (cm.getCursor('from').line === i) {
        // We're directly in the formatting so don't render.
        continue
      }

      let j = i
      let fromCh = 0
      let fromLine = i
      let toCh = 0
      let toLine = j
      let eq = ''

      // First get the line and test if the contents contain a math element
      let line = cm.getLine(i)
      if (line === '$$') {
        j++
        // Multiline equation
        while (j < cm.lineCount() && cm.getLine(j) !== '$$') {
          eq += cm.getLine(j) + '\n'
          j++
        }
        // If the following if becomes true, there was no matching element in
        // the whole document -> don't render!
        if (cm.getLine(j) !== '$$') continue
        i = j // After this excursus continue with the next line
        toLine = j
        toCh = 2 // Include the closing characters ($$)
        // Is the cursor here somewhere?
        if (cm.getCursor('from').line >= fromLine && toLine >= cm.getCursor('from').line) {
          continue
        }
      } else if ((match = mathRE.exec(line)) != null) {
        fromCh = match.index
        toCh = match.index + match[0].length
        eq = match[1] || match[2]
      } else {
        // Found neither multiline nor single line
        continue
      }

      let curFrom = { 'line': fromLine, 'ch': fromCh }
      let curTo = { 'line': toLine, 'ch': toCh }

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
      require('katex').render(eq, elem, {
        throwOnError: false
      })
      textMarker.changed()

      mathMarkers.push(textMarker)
    }
  }
})
