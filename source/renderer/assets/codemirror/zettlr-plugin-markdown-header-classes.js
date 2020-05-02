/* global define CodeMirror */
// This plugin applies specific line classes to markdown headings to enable you
// to enlargen them via CSS.

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

  /**
   * This command applies the classes size-header-x for all six different
   * markdown headings.
   * @param  {CodeMirror} cm The CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownHeaderClasses = function (cm) {
    let wrapperClass = ''
    let needsRefresh = false // Will be set to true if at least one line has been altered

    // Buffer changes
    cm.startOperation()

    for (let i = 0; i < cm.lineCount(); i++) {
      let oldClass = ''

      // Retrieve the wrapper class
      wrapperClass = cm.lineInfo(i).wrapClass

      // Save the old class name
      if (/size-header-\d/.test(wrapperClass)) {
        oldClass = /(size-header-\d)/.exec(wrapperClass)[1]
      }

      // Then remove all header styles
      for (let x = 1; x < 7; x++) cm.removeLineClass(i, 'wrap', `size-header-${x}`)

      // Only re-apply a header class if allowed.
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown-zkn') {
        // Indicate a refresh if necessary
        if (oldClass !== '') needsRefresh = true
        continue
      }

      // Then re-add the header classes as appropriate.
      let match = /^(#{1,6}) /.exec(cm.getLine(i))
      if (match) {
        cm.addLineClass(i, 'wrap', `size-header-${match[1].length}`)
        // If the new header class is different
        // than the old one, indicate a refresh.
        if (oldClass !== `size-header-${match[1].length}`) needsRefresh = true
      }

      if (i === 0) continue // No need to check for Setext header

      // Check for Setext headers. According to the CommonMark
      // spec: At most 3 preceeding spaces, no internal spaces
      match = /^[ ]{0,3}[=]+[ ]*$|^[ ]{0,3}[-]+[ ]*$/.exec(cm.getLine(i))
      if (match) {
        // We got a match, so first determine its level
        let level = (match[0].indexOf('=') > -1) ? 1 : 2
        // Now determine the span of the heading, because
        // the heading can span an arbitrary number (but
        // not contain a blank line, obviously)
        let begin = i - 1
        for (; begin >= 0; begin--) {
          // First empty line stops the heading. Also, check for
          // lists, because strictly speaking, this might also
          // return truthy for a Setext heading.
          let beginningLine = cm.getLine(begin)
          if (/^\s*$/.test(beginningLine) || /^\s*-\s+/.test(beginningLine)) {
            begin++
            break
          }
        }

        if (begin === i) continue // False alarm

        // Add the correct line classes to both lines
        for (let line = begin; line <= i; line++) {
          cm.addLineClass(line, 'wrap', `size-header-${level}`)
        }

        // If the new header class is different
        // than the old one, indicate a refresh.
        if (oldClass !== `size-header-${level}`) needsRefresh = true
      }
    }

    // End operation (apply the buffer to the layouting and force a repaint)
    cm.endOperation()

    // If at least one header class has been altered, refresh the codemirror
    // instance as the sizes won't match up in that case.
    if (needsRefresh) cm.refresh()
  }
})
