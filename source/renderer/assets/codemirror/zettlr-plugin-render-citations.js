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

  // Should match everything permittible -- first alternative are the huge
  // blocks, second alternative are the simple @ID-things, both recognised by
  // Pandoc citeproc.
  // citationRE is taken from the Citr library (the extraction regex)
  var citationRE = /(\[([^[\]]*@[^[\]]+)\])|(?<=\s|^)(@[\p{L}\d_][\p{L}\d_:.#$%&\-+?<>~/]*)/gu
  var citeMarkers = [] // CiteMarkers
  var currentDocID = null
  var Citr = require('@zettlr/citr')

  CodeMirror.commands.markdownRenderCitations = function (cm) {
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of citeMarkers) {
        if (marker.find()) marker.clear()
      }
      citeMarkers = [] // Flush it away!
    }

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    for (let i in citeMarkers) {
      if (citeMarkers[i] && citeMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        citeMarkers.splice(i, 1)
      }
    }

    // Now render all potential new links
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      citationRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if (!citationRE.test(line)) continue

      citationRE.lastIndex = 0 // Necessary because of global flag in RegExp

      // Run through all links on this line
      while ((match = citationRE.exec(line)) != null) {
        let citation = match[1] || match[3]

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

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        if (cm.getTokenAt(curFrom).type === 'comment' ||
            cm.getTokenAt(curTo).type === 'comment') {
          continue
        }

        // A final check, as there is an edge case where if people use [[]] as
        // their internal links, and decide to use @-characters somewhere in
        // there, this plugin will attempt to render this as a citation as well
        // Hence: The citation shall not be encapsulated in square brackets.
        // See https://github.com/Zettlr/Zettlr/issues/1046
        let prefix = line.substr(curFrom.ch - 1, 2)
        let suffix = line.substr(curTo.ch - 1, 2)
        if (prefix === '[[' && suffix === ']]') continue

        let span = document.createElement('span')
        span.className = 'citeproc-citation' // citations
        // The text content will be updated automatically based upon the ID
        try {
          // Try to extract the citekeys for the context menu to list them
          let key = Citr.parseSingle(citation).map(elem => elem.id).join(',')
          span.dataset.citekeys = key // data-citekeys="key1,key2"
        } catch (err) {
          // Do nothing
        }
        span.textContent = citation
        // Apply TextMarker
        try {
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

          // Finally push the marker into the array
          citeMarkers.push(textMarker)
        } catch (e) {
          // CodeMirror throws errors if one tries to paper over an existing
          // mark with a new marker. In this case, don't mark the text and simply
          // do nothing.
        }
      }
    }
  }
})
