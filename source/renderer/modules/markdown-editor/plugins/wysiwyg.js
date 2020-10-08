/* global define CodeMirror */
// This plugin gives the editor a real WYSIWYG feeling

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

  // Should match everything permittible -- first alternative are the huge
  // blocks, second alternative are the simple @ID-things, both recognised by
  // Pandoc citeproc.
  var wysiwygRE = /__(.+?)__|_(.+?)_|\*\*(.+?)\*\*|\*(.+?)\*|^(#{1,6}) (.+?)$|^(?:\s*)> (.+)$|`(.+?)`/gi
  /**
   * Match explanation:
   * 1. Underscore strong
   * 2. Underscore emphasis
   * 3. Asterisk strong
   * 4. Asterisk emphasis
   * 5. Heading levels 1-6 (mark)
   * 6. Heading levels 1-6 (content)
   * 7. Blockquotes
   * 8. Inline code
   */

  // WYSIWYG means you need HTML elements rendered instead of
  // the underlying Markdown code
  const md2html = require('../../../../common/util/md-to-html')

  CodeMirror.commands.markdownWYSIWYG = function (cm) {
    let match

    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      wysiwygRE.lastIndex = 0

      // First get the line and test if the contents contain a link
      let line = cm.getLine(i)
      if (!wysiwygRE.test(line)) {
        continue
      }

      wysiwygRE.lastIndex = 0 // Necessary because of global flag in RegExp

      // Run through all elements in this line
      while ((match = wysiwygRE.exec(line)) != null) {
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

        // Let's find out what kind of element we should create
        let elemName = ''
        let className = ''
        let styles = ['display: inline'] // Make sure the elements are always inline
        if (match[1]) elemName = className = 'strong'
        if (match[2]) elemName = className = 'em'
        if (match[3]) elemName = className = 'strong'
        if (match[4]) elemName = className = 'em'
        if (match[5] && match[6]) {
          elemName = 'h' + match[5].length
          className = 'heading'
          styles.push('font-size: inherit')
        }
        if (match[7]) { elemName = 'blockquote'; className = 'quote' }
        if (match[8]) { elemName = 'code'; className = 'comment' }

        // We also need the text contents
        let contents = match[1] || match[2] || match[3] || match[4] || match[6] || match[7] || match[8]

        let elem = document.createElement(elemName)
        // The inner HTML contains the contents inside the element. We'll also
        // render any Markdown inside the element so that it looks nice.
        // We need to remove the containing paragraphs!
        elem.innerHTML = md2html(contents).replace(/<p>(.*?)<\/p>/g, '$1')
        elem.style = styles.join('; ') // Add the styles
        elem.className = 'cm-' + className // Apply the corresponding class
        // Apply TextMarker
        try {
          let textMarker = cm.markText(
            curFrom, curTo,
            {
              'clearOnEnter': true,
              'replacedWith': elem,
              'inclusiveLeft': false,
              'inclusiveRight': false
            }
          )

          elem.onclick = (e) => {
            textMarker.clear()
            cm.setCursor(cm.coordsChar({ 'left': e.clientX, 'top': e.clientY }))
            cm.focus()
          }
        } catch (e) {
          // CodeMirror throws errors if one tries to paper over an existing
          // mark with a new marker. In this case, don't mark the text and simply
          // do nothing.
          console.error(e)
        }
      }
    }
  }
})
