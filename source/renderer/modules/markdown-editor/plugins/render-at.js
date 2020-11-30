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

  var headRE = /^(\s*)(\@[A-Za-z0-9]+)/g

  var currentCallback = null

  CodeMirror.commands.markdownRenderAtTags = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      headRE.lastIndex = 0

      // First get the line and test if the contents contain an @
      let line = cm.getLine(i)
      if ((match = headRE.exec(line)) == null) {
        continue
      }

      // Now get the precise beginning of the match and its end
      let curFrom = { 'line': i, 'ch': match.index }
      let curTo = { 'line': i, 'ch': match.index + match[1].length + match[2].length + 1 }

      let cur = cm.getCursor('from')
      if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
        // Cursor is in selection: Do not render.
        continue
      }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      console.log(match);

      let atTag = document.createElement('span')
      atTag.className = 'at-tag'
      atTag.textContent = match[2] + match[1].slice(match[2].length).split("").map(x => " ").join("");

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': atTag,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      atTag.onclick = (e) => {
        textMarker.clear()
        cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
        cm.focus()
      }
    }
  }
})
