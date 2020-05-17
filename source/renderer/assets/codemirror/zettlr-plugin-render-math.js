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

  // Matches all inlines according to the Pandoc documentation
  // on its tex_math_dollars-extension.
  // More information: https://pandoc.org/MANUAL.html#math
  // First alternative is only for single-character-equations
  // such as $x$. All others are captured by the second alternative.
  var inlineMathRE = /(?<!\\)\${1,2}([^\s\\])\${1,2}(?!\d)|(?<!\\)\${1,2}([^\s].*?[^\s\\])\${1,2}(?!\d)/g
  var multilineMathRE = /^\s*\$\$\s*$/
  var mathMarkers = []
  var currentDocID = null

  CodeMirror.commands.markdownRenderMath = function (cm) {
    let i = 0
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of mathMarkers) {
        if (marker.find()) marker.clear()
      }
      mathMarkers = [] // Flush it away!
    }

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
    let isMultiline = false // Are we inside a multiline?
    let eq = ''
    let fromLine = i

    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
      // Reset the index of the expression everytime we enter a new line.
      inlineMathRE.lastIndex = 0

      // This array holds all markers to be inserted (either one in case of the
      // final line of a multiline-equation or multiple in case of several
      // inline equations).
      let newMarkers = []

      let line = cm.getLine(i)
      if (!isMultiline && multilineMathRE.test(line)) {
        isMultiline = true
        fromLine = i
        eq = ''
      } else if (isMultiline && !multilineMathRE.test(line)) {
        // Simply add the line to the equation and continue
        eq += line + '\n'
        continue
      } else if (isMultiline && multilineMathRE.test(line)) {
        // We have left the multiline equation and can render it now.
        isMultiline = false
        newMarkers.push({
          'curFrom': { 'ch': 0, 'line': fromLine },
          'curTo': { 'ch': 2, 'line': i },
          'eq': eq
        })
        eq = '' // Reset the equation
      } else {
        // Else: No multiline. Search for inlines.
        while ((match = inlineMathRE.exec(line)) != null) {
          newMarkers.push({
            'curFrom': { 'ch': match.index, 'line': i },
            'curTo': { 'ch': match.index + match[0].length, 'line': i },
            // An equation is stored in the first capturing group or
            // second, depending on whether there only was
            // one char, or multiple ones within the equation.
            'eq': match[1] || match[2] || ''
          })
        }
      }

      // Now cycle through all new markers and insert them, if they weren't
      // already
      for (let myMarker of newMarkers) {
        let cur = cm.getCursor('from')
        let isMulti = myMarker.curFrom.line !== myMarker.curTo.line
        if (isMulti && cur.line >= myMarker.curFrom.line && cur.line <= myMarker.curTo.line) {
          // We're directly in the multiline equation, so don't render.
          continue
        } else if (!isMulti && cur.line === myMarker.curFrom.line && cur.ch >= myMarker.curFrom.ch && cur.ch <= myMarker.curTo.ch) {
          // Again, we're right in the middle of an inline-equation, so don't render.
          continue
        }

        let isRendered = false
        let marks = cm.findMarks(myMarker.curFrom, myMarker.curTo)
        for (let marx of marks) {
          if (mathMarkers.includes(marx)) {
            isRendered = true
            break
          }
        }

        // Also in this case simply skip.
        if (isRendered) continue

        // Use jQuery for simple creation of the DOM element
        let elem = $('<span class="preview-math"></span>')[0]

        let textMarker = cm.markText(
          myMarker.curFrom, myMarker.curTo,
          {
            'clearOnEnter': true,
            'replacedWith': elem,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )

        // Enable on-click closing of rendered Math elements.
        elem.onclick = (e) => { textMarker.clear() }

        require('katex').render(myMarker.eq, elem, { throwOnError: false })

        // Now the marker has obviously changed
        textMarker.changed()

        // Finally push the marker
        mathMarkers.push(textMarker)
      } // End for all markers
    } // End for lines
  } // End command
})
