/* global CodeMirror define */
// This plugin renders Bear-style heading indicators

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

  var headRE = /^(#{1,6}) (.*)/g
  var headMarkers = []
  var currentDocID = null

  CodeMirror.commands.markdownRenderHTags = function (cm) {
    let i = 0
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of headMarkers) {
        if (marker.find()) marker.clear()
      }
      headMarkers = [] // Flush it away!
    }

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!headMarkers[i]) {
        continue
      }
      if (headMarkers[i] && headMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        headMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < headMarkers.length)

    // Now render all potential new tasks
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
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

      let isRendered = false
      let marks = cm.findMarks(curFrom, curTo)
      for (let marx of marks) {
        if (headMarkers.includes(marx)) {
          isRendered = true
          break
        }
      }

      // Also in this case simply skip.
      if (isRendered) continue

      let hTag = document.createElement('span')
      hTag.className = 'heading-tag'
      hTag.textContent = 'h' + headingLevel

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': hTag,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      // Clear on click
      hTag.onclick = (e) => { textMarker.clear() }

      headMarkers.push(textMarker)
    }
  }
})
