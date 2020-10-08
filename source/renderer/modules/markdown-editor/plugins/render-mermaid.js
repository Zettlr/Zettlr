/* global define CodeMirror */
// This plugin renders mermaid code blocks.

const mermaid = require('mermaid')

;(function (mod) {
  if (typeof exports === 'object' && typeof module === 'object') { // CommonJS
    mod(require('codemirror/lib/codemirror'))
  } else if (typeof define === 'function' && define.amd) { // AMD
    define(['codemirror/lib/codemirror'], mod)
  } else { // Plain browser env
    mod(CodeMirror)
  }
})(function (CodeMirror) {
  'use strict'

  // Initialise the mermaid API
  // TODO: Theming!
  mermaid.mermaidAPI.initialize({ startOnLoad: false, theme: 'dark'/*, theme: null */ })

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderMermaid = function (cm) {
    let codeblock = [] // Holds a mermaid code block
    let currentCursorPosition = cm.getCursor('from').line

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue

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

        const curFrom = { 'line': startLine, 'ch': 0 }
        const curTo = { 'line': endLine, 'ch': 3 }
        // We can only have one marker at any given position at any given time
        if (cm.findMarks(curFrom, curTo).length > 0) continue

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
      }
    }
  }
})
