/* global define CodeMirror */
// This plugin renders citations

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

  // This regular expression matches three different kinds of URLs:
  // 1. Markdown URLs in the format [Caption](www.link-target.tld)
  // 2. Standalone links, either beginning with http(s):// or www.
  // 3. Email addresses.
  var citationRE = /\[@(\w+?)\]/gi
  // Matches [Link](www.xyz.tld) and simple links
  var citeMarkers = []

  CodeMirror.commands.markdownRenderCitations = function (cm) {
    let i = 0
    let match

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!citeMarkers[i]) {
        continue
      }
      if (citeMarkers[i] && citeMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        citeMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < citeMarkers.length)

    // Now render all potential new links
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      citationRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if (!citationRE.test(line)) {
        continue
      }

      citationRE.lastIndex = 0 // Necessary because of global flag in RegExp

      // Run through all links on this line
      while ((match = citationRE.exec(line)) != null) {
        let id = match[1] || ''
        console.log(match[1])

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
          // Cursor is in selection: Do not render.
          continue
        }

        // Has this thing already been rendered?
        let con = false
        let marks = cm.findMarks(curFrom, curTo)
        for (let marx of marks) {
          if (citeMarkers.includes(marx)) {
            // We've got communism. (Sorry for the REALLY bad pun.)
            con = true
            break
          }
        }
        if (con) continue // Skip this match

        let span = document.createElement('span')
        span.className = 'citation' // CodeMirrorAnchors
        if (cm.getOption('cite')) {
          span.textContent = cm.getOption('cite')(id) || '@' + id
        } else {
          span.textContent = '@' + id
        }
        // Apply TextMarker
        let textMarker = cm.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': span,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )

        span.onclick = (e) => {
          textMarker.clear()
          cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
          cm.focus()
        }

        citeMarkers.push(textMarker)
      }
    }
  }
})
