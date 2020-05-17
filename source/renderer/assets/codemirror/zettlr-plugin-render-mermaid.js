/* global define CodeMirror */
// This plugin renders mermaid code blocks.

const mermaid = require('mermaid')

;(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('../../../node_modules/codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['../../../node_modules/codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // Initialise the mermaid API
  // TODO: Theming!
  mermaid.mermaidAPI.initialize({ startOnLoad: false, theme: 'dark'/*, theme: null */ })

  // Holds the currently rendered diagrams
  var mermaidMarkers = []
  var currentDocID = null

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderMermaid = function (cm) {
    let i = 0
    let codeblock = [] // Holds a mermaid code block
    let currentCursorPosition = cm.getCursor('from').line

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of mermaidMarkers) {
        if (marker.find()) marker.clear()
      }
      mermaidMarkers = [] // Flush it away!
    }

    // First remove images that may not exist anymore. As soon as someone
    // clicks into the image, it will be automatically removed, as well as
    // if someone simply deletes the whole line.
    do {
      if (!mermaidMarkers[i]) continue
      if (mermaidMarkers[i] && mermaidMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        mermaidMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < mermaidMarkers.length)

    // Now render all potential new images
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue

      // Cursor is in here, so also don't render (for now)
      if (currentCursorPosition === i) continue

      if (/^```mermaid/.test(cm.getLine(i))) {
        codeblock = [] // Reset codeblock
        let startLine = i
        let endLine = i
        // Now read in all other lines one by one
        let cursorInBlock = false
        let j = i + 1 // Actually begin on the next line to exclude ```mermaid
        for (; j < cm.lineCount(); j++) {
          if (currentCursorPosition === j) {
            cursorInBlock = true
            break
          }
          if (/^```\s*$/.test(cm.getLine(j))) {
            // We're done reading in the codeblock
            endLine = j
            break
          }
          // Add the line to the codeblock
          codeblock.push(cm.getLine(j))
        }

        // Update the outer counter
        i = j++

        if (cursorInBlock) {
          codeblock = [] // Reset codeblock and continue
          continue
        }

        // We've got a codeblock! Let's perform some additional checks
        if (endLine <= startLine) continue

        // Has this thing already been rendered?
        let con = false
        let marks = cm.findMarks({ 'line': startLine, 'ch': 0 }, { 'line': endLine, 'ch': 3 })
        for (let marx of marks) {
          if (mermaidMarkers.includes(marx)) {
            // We've got communism. (Sorry for the REALLY bad pun.)
            con = true
            break
          }
        }
        if (con) continue // Skip this match

        // Merge the block together
        let code = codeblock.join('\n')
        let svg = document.createElement('span')
        svg.classList.add('mermaid-chart')
        try {
          let graph = mermaid.mermaidAPI.render(`graphDivL${startLine}-L${endLine}${Date.now()}`, code)
          svg.innerHTML = graph
        } catch (err) {
          svg.classList.add('error')
          // TODO: Localise!
          svg.innerText = `Could not render Graph:\n\n${err.message}`
        }

        // Now add a line widget to this line.
        let textMarker = cm.markText(
          { 'line': startLine, 'ch': 0 },
          { 'line': endLine, 'ch': 3 },
          {
            'clearOnEnter': true,
            'replacedWith': svg,
            'handleMouseEvents': true
          }
        )
        svg.onclick = (e) => { textMarker.clear() }

        // Finally: Push the textMarker into the array
        mermaidMarkers.push(textMarker)
      }
    }
  }
})
