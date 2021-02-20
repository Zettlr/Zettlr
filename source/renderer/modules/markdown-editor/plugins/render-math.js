/* global CodeMirror define */
// This plugin renders MathJax parts in CodeMirror instances

const { getBlockMathRE, getInlineMathRenderRE } = require('../../../../common/regular-expressions');

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

  const katex = require('katex')
  require('katex/dist/contrib/mhchem.js') // modify katex module

  var multilineMathRE = getBlockMathRE()

  CodeMirror.commands.markdownRenderMath = function (cm) {
    // First, render all potential new Math elements
    let isMultiline = false // Are we inside a multiline?
    let eq = ''
    let fromLine = 0

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      let modeName = cm.getModeAt({ 'line': i, 'ch': 0 }).name
      if (![ 'markdown', 'stex' ].includes(modeName)) continue
      if (modeName === 'stex') {
        // Make sure the token list includes "multiline-equation"
        // because otherwise we shouldn't render this as it's within
        // a default LaTeX code block, not an equation.
        let tokenType = cm.getTokenTypeAt({ 'line': i, 'ch': 0 })
        let isMultilineBeginning = multilineMathRE.test(cm.getLine(i))
        let isMultilineEquation = tokenType && tokenType.indexOf('multiline-equation') >= 0
        if (!isMultilineBeginning && !isMultilineEquation) continue
      }

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

        // We can only have one marker at any given position at any given time
        if (cm.doc.findMarks(myMarker.curFrom, myMarker.curTo).length > 0) continue

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        let tokenTypeBegin = cm.getTokenTypeAt(myMarker.curFrom)
        let tokenTypeEnd = cm.getTokenTypeAt(myMarker.curTo)
        if ((tokenTypeBegin && tokenTypeBegin.includes('comment')) ||
        (tokenTypeEnd && tokenTypeEnd.includes('comment'))) {
          continue
        }

        let elem = document.createElement('span')
        elem.classList.add('preview-math')

        let textMarker = cm.doc.markText(
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

        katex.render(myMarker.eq, elem, { throwOnError: false, displayMode: myMarker.displayMode  })

        // Now the marker has obviously changed
        textMarker.changed()
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
    var inlineMathRE = getInlineMathRenderRE(true) // Get the RE with the global flag set. 
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
