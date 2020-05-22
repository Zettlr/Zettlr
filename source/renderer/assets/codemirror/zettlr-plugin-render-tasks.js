/* global CodeMirror define */
// This plugin renders GitHub Flavoured Markdown Task items

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

  var taskRE = /^(\s*)([-+*]) \[( |x)\] /g // Matches `- [ ]` and `- [x]`
  var taskMarkers = []
  var currentDocID = null

  CodeMirror.commands.markdownRenderTasks = function (cm) {
    let i = 0
    let match

    if (currentDocID !== cm.doc.id) {
      currentDocID = cm.doc.id
      for (let marker of taskMarkers) {
        if (marker.find()) marker.clear()
      }
      taskMarkers = [] // Flush it away!
    }

    // First remove links that don't exist anymore. As soon as someone
    // moves the cursor into the link, it will be automatically removed,
    // as well as if someone simply deletes the whole line.
    do {
      if (!taskMarkers[i]) {
        continue
      }
      if (taskMarkers[i] && taskMarkers[i].find() === undefined) {
        // Marker is no longer present, so splice it
        taskMarkers.splice(i, 1)
      } else {
        i++
      }
    } while (i < taskMarkers.length)

    // Now render all potential new tasks
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') continue
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

      let isRendered = false
      let marks = cm.findMarks(curFrom, curTo)
      for (let marx of marks) {
        if (taskMarkers.includes(marx)) {
          isRendered = true
          break
        }
      }

      // Also in this case simply skip.
      if (isRendered) continue

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

      cbox.onclick = (e) => {
        if (cm.getOption('disableInput')) return // Don't do anything

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
        taskMarkers.splice(taskMarkers.indexOf(textMarker), 1)
        textMarker = cm.markText(
          curFrom, curTo,
          {
            'clearOnEnter': true,
            'replacedWith': cbox,
            'inclusiveLeft': false,
            'inclusiveRight': false
          }
        )
        taskMarkers.push(textMarker)
      }

      taskMarkers.push(textMarker)
    }
  }
})
