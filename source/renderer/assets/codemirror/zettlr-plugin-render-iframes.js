/* global CodeMirror $ define */
// This plugin renders iFrames in CodeMirror instances

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

  var iframeRE = /^<iframe.*?>.*?<\/iframe>$/i // Matches all iframes
  var iframeMarkers = []
  var currentDocID = null

  CodeMirror.commands.markdownRenderIframes = function (cm) {
    let i = 0
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of iframeMarkers) {
        if (marker.find()) marker.clear()
      }
      iframeMarkers = [] // Flush it away!
    }

    // First remove iFrames that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!iframeMarkers[i]) {
        continue
      }
      if (iframeMarkers[i] && iframeMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        iframeMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < iframeMarkers.length)

    // Now render all potential new iFrames
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
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

      let isRendered = false
      let marks = cm.findMarks(curFrom, curTo)
      for (let marx of marks) {
        if (iframeMarkers.includes(marx)) {
          isRendered = true
          break
        }
      }

      // Also in this case simply skip.
      if (isRendered) continue

      // Now we can render it finally.

      let iframe = $(match[0])[0] // Use jQuery for simple creation of the DOM element

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': iframe,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      iframeMarkers.push(textMarker)
    }
  }
})
