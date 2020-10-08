/* global CodeMirror define */
// This plugin renders GitHub Flavoured Markdown Task items

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

  var taskRE = /^(\s*)([-+*]) \[( |x)\] /g // Matches `- [ ]` and `- [x]`

  CodeMirror.commands.markdownRenderTasks = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advances it.
      taskRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if ((match = taskRE.exec(line)) == null) {
        continue
      }
      let leadingSpaces = match[1].length || 0

      if (cm.getCursor('from').line === i && cm.getCursor('from').ch < 5 + leadingSpaces) {
        // We're directly in the formatting so don't render.
        continue
      }

      let curFrom = { 'line': i, 'ch': 0 + leadingSpaces }
      let curTo = { 'line': i, 'ch': 5 + leadingSpaces }

      // We can only have one marker at any given position at any given time
      if (cm.findMarks(curFrom, curTo).length > 0) continue

      // Now we can render it finally.
      let checked = (match[3] === 'x')
      let listSign = match[2] // Save the sign +, -, or * for later

      let cbox = document.createElement('input')
      cbox.type = 'checkbox'
      if (checked) cbox.checked = true

      let textMarker = cm.markText(
        curFrom, curTo,
        {
          'clearOnEnter': true,
          'replacedWith': cbox,
          'inclusiveLeft': false,
          'inclusiveRight': false
        }
      )

      // Clear the textmarker once it's hidden b/c we'd rather
      // re-render than having a wrong state associated with the marker
      textMarker.on('hide', () => { textMarker.clear() })

      cbox.onclick = (e) => {
        if (cm.isReadOnly()) return // Don't do anything

        // First, recalculate where the checkbox actually is.
        let markerLine = textMarker.find().from.line
        taskRE.lastIndex = 0
        let m = taskRE.exec(cm.getLine(markerLine))
        let leadingSpaces = (m && m[1]) ? m[1].length : 0
        let curFrom = { 'line': markerLine, 'ch': 0 + leadingSpaces }
        let curTo = { 'line': markerLine, 'ch': 5 + leadingSpaces }

        // Check or uncheck it
        // Check the checkbox, alter the underlying text and replace the
        // text marker in the list of checkboxes.
        let check = (cbox.checked) ? 'x' : ' '
        cm.replaceRange(`${listSign} [${check}]`, curFrom, curTo)
        // ReplaceRange removes the marker, so we have to re-initiate it
        textMarker = cm.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': cbox,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )
      }
    }
  }
})
