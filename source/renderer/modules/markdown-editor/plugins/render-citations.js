/* global define CodeMirror */
// This plugin renders citations

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

  const { ipcRenderer } = require('electron')

  // Listen to IPC events to update the citations
  ipcRenderer.on('citation-renderer', (event, message) => {
    const { command, payload } = message

    if (command === 'get-citation') {
      // Find the correct citation and replace the span's text content
      // with the correct, rendered citation
      let spanToRender = toRender.find(elem => elem.citation === payload.originalCitation)
      if (spanToRender !== undefined) {
        // Replace HTML content and remove item from array
        // We need to set the HTML as citeproc may spit out <i>-tags etc.
        spanToRender.element.innerHTML = payload.renderedCitation
        toRender.splice(toRender.indexOf(spanToRender), 1)
      }
    }
  })

  // Should match everything permittible -- first alternative are the huge
  // blocks, second alternative are the simple @ID-things, both recognised by
  // Pandoc citeproc.
  // citationRE is taken from the Citr library (the extraction regex)
  var citationRE = /(\[(?:[^[\]]*@[^[\]]+)\])|(?<=\s|^)(@[\p{L}\d_][\p{L}\d_:.#$%&\-+?<>~/]*)/gu
  var Citr = require('@zettlr/citr')

  /**
   * This Array contains citations that should be rendered somewhere in the DOM
   *
   * @var {Object[]}
   */
  let toRender = []

  CodeMirror.commands.markdownRenderCitations = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
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
        let citation = match[1] || match[2]

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch) {
          // Cursor is in selection: Do not render.
          continue
        }

        // We can only have one marker at any given position at any given time
        if (cm.findMarks(curFrom, curTo).length > 0) continue

        // Do not render if it's inside a comment (in this case the mode will be
        // markdown, but comments shouldn't be included in rendering)
        // Final check to avoid it for as long as possible, as getTokenAt takes
        // considerable time.
        let tokenTypeBegin = cm.getTokenTypeAt(curFrom)
        let tokenTypeEnd = cm.getTokenTypeAt(curTo)
        if ((tokenTypeBegin && tokenTypeBegin.includes('comment')) ||
        (tokenTypeEnd && tokenTypeEnd.includes('comment'))) {
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
          console.log('Error attempting to parse citation ' + citation, err)
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

          // Now that everything is done, request the citation and replace the
          // text contents accordingly
          toRender.push({
            'citation': citation,
            'element': span
          })

          ipcRenderer.send('citation-renderer', {
            command: 'get-citation',
            payload: { citation: citation }
          })
        } catch (e) {
          // CodeMirror throws errors if one tries to paper over an existing
          // mark with a new marker. In this case, don't mark the text and simply
          // do nothing.
          console.error('Could not render marker: Text was already marked!')
        }
      }
    }
  }
})
