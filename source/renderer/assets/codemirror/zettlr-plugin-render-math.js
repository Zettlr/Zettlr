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

  var multilineMathRE = /^(\s*\$\$)\s*$/
  var mathMarkers = []

  CodeMirror.commands.markdownRenderMath = function (cm) {
    let i = 0

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

      // This array holds all markers to be inserted (either one in case of the
      // final line of a multiline-equation or multiple in case of several
      // inline equations).
      let newMarkers = []

      let line = cm.getLine(i)
      let multilineMathMatch = multilineMathRE.exec(line)
      let isMultilineStartOrEnd = multilineMathMatch !== null
      if (!isMultiline && isMultilineStartOrEnd) {
        isMultiline = true
        fromLine = i
        eq = ''
      } else if (isMultiline && !isMultilineStartOrEnd) {
        // Simply add the line to the equation and continue
        eq += line + '\n'
        continue
      } else if (isMultiline && isMultilineStartOrEnd) {
        // We have left the multiline equation and can render it now.
        isMultiline = false
        newMarkers.push({
          'curFrom': { 'ch': 0, 'line': fromLine },
          'curTo': { 'ch': multilineMathMatch[1].length, 'line': i },
          'eq': eq,
          'displayMode': true
        })
        eq = '' // Reset the equation
      } else {
        // Else: No multiline. Search for inline equations.
        newMarkers.push.apply(newMarkers, EquationFinder.findInlineEquations(line, i))
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

        require('katex').render(myMarker.eq, elem, { throwOnError: false, displayMode: myMarker.displayMode })

        // Now the marker has obviously changed
        textMarker.changed()

        // Finally push the marker
        mathMarkers.push(textMarker)
      }
    }
  }
})

EquationFinder = {
  /**
   * Finds all equations contained in a given string according to the Pandoc documentation
   * on its tex_math_dollars-extension.
   * More information: https://pandoc.org/MANUAL.html#math
   * @param {string} text the input string
   * @param {int} line the line number of the input
   * @returns {Array} list of equations in the input
   */
  findInlineEquations: function (text, line) {
    var inlineMathRE = /(?<![\\$])(?<dollar>\${1,2})(?![\s$])(?<eq>.+?)(?<![\s\\])\k<dollar>(?!\d)/g
    let newMarkers = []

    let match
    while ((match = inlineMathRE.exec(text)) !== null) {
      newMarkers.push({
        'curFrom': { 'ch': match.index, 'line': line },
        'curTo': { 'ch': match.index + match[0].length, 'line': line },
        'eq': match.groups.eq || '',
        // Equations surrounded by two dollars should be displayed as centered equation
        'displayMode': (match.groups.dollar || '').length === 2
      })
    }
    return newMarkers
  }
}
