/* global CodeMirror define */
// This plugin renders Bear-style heading indicators

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

  var headRE = /^(#{1,6}) (.*)/g

  CodeMirror.commands.markdownRenderHTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if ((match = headRE.exec(line)) == null) {
        continue
      }
      let headingLevel = match[1].length

      let curFrom = cm.getCursor('from')
      let curTo = { 'line': i, 'ch': headingLevel }

      if (curFrom.line === i && curFrom.ch < headingLevel && curFrom.ch > 0) {
        // We're directly in the formatting so don't render.
        continue
      }

      curFrom = { 'line': i, 'ch': 0 }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      let hTagWrapper = document.createElement('div')
      hTagWrapper.className = 'heading-tag'

      let hTag = document.createElement('span')
      hTag.textContent = 'h' + headingLevel
      hTagWrapper.appendChild(hTag)

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': hTagWrapper,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      // Clear on click
      hTagWrapper.onclick = (e) => { textMarker.clear() }
    }
  }
})
