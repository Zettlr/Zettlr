/* global define CodeMirror Image */
// This plugin renders markdown block images

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

  // GENERAL PLUGIN VARIABLES
  const { getImageRE } = require('../../../../common/regular-expressions')
  const makeAbsoluteURL = require('../../../../common/util/make-absolute-url')

  // Image detection regex
  var imageRE = getImageRE()

  // This variable holds a base64 encoded placeholder image.
  var img404 = 'data:image/png;base64,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'

  /**
   * Defines the CodeMirror command to render all found markdown images.
   * @param  {CodeMirror} cm The calling CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownRenderImages = function (cm) {
    // We'll only render the viewport
    const viewport = cm.getViewport()
    for (let i = viewport.from; i < viewport.to; i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue

      // Always reset lastIndex property, because test()-ing on regular
      // expressions advance it.
      imageRE.lastIndex = 0

      // First get the line and test if the contents contain an image
      let line = cm.getLine(i)
      if (!imageRE.test(line)) continue

      imageRE.lastIndex = 0 // Necessary because of global flag in RegExp

      let match

      // Run through all links on this line
      while ((match = imageRE.exec(line)) != null) {
        let altText = match[1] || ''
        let title = match[3] || altText
        let url = match[2] || ''

        // Now get the precise beginning of the match and its end
        let curFrom = { 'line': i, 'ch': match.index }
        let curTo = { 'line': i, 'ch': match.index + match[0].length }

        let cur = cm.getCursor('from')
        if (cur.line === curFrom.line && cur.ch >= curFrom.ch && cur.ch <= curTo.ch + 1) {
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

        let img = new Image()
        // Now add a line widget to this line.
        let textMarker = cm.markText(
          curFrom,
          curTo,
          {
            'clearOnEnter': true,
            'replacedWith': img,
            'handleMouseEvents': true
          }
        )

        // Retrieve the size constraints
        const maxPreviewWidth = cm.getOption('zettlr').imagePreviewWidth
        const maxPreviewHeight = cm.getOption('zettlr').imagePreviewHeight
        let width = (maxPreviewWidth) ? maxPreviewWidth + '%' : '100%'
        let height = (maxPreviewHeight && maxPreviewHeight < 100) ? maxPreviewHeight + 'vh' : ''
        img.style.maxWidth = width
        img.style.maxHeight = height
        img.style.cursor = 'default' // Nicer cursor
        img.alt = altText
        // Display a replacement image in case the correct one is not found
        img.onerror = () => { img.src = img404 }
        img.onclick = () => { textMarker.clear() }

        // Update the image title on load to retrieve the real image size.
        img.onload = () => {
          img.title = `${title} (${img.naturalWidth}x${img.naturalHeight}px)`
          textMarker.changed()
        }

        // Check if there is a title to replace
        if (match[3]) url = url.replace(`"${match[3]}"`, '').trim()

        // Finally set the src to begin the loading process of the image
        if (/data:[a-zA-Z0-9/;=]+(?:;base64){0,1},.+/.test(url)) {
          img.src = url
        } else {
          img.src = makeAbsoluteURL(cm.getOption('zettlr').markdownImageBasePath, url)
        }
      }
    }
  }
})
