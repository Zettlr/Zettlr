/* global define CodeMirror */
// This plugin applies specific line classes to code blocks to enable you
// to style them via CSS.

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
   * This command applies the class cm-code-block-line to all code block lines
   * @param  {CodeMirror} cm The CodeMirror instance
   * @return {void}    Commands do not return.
   */
  CodeMirror.commands.markdownCodeblockClasses = function (cm) {
    let needsRefresh = false // Will be set to true if at least one line has been altered
    let isCodeBlock = false
    let codeblockClass = 'code-block-line'

    // Buffer changes
    cm.startOperation()

    for (let i = 0; i < cm.lineCount(); i++) {
      // Each code block line toggles the isCodeBlock variable (but the
      // codeblocks themselves should not be styled)
      if (/^(?:`{3}|~{3}).*/.test(cm.getLine(i))) {
        isCodeBlock = !isCodeBlock
        continue
      }

      let wrapClass = cm.lineInfo(i).wrapClass
      let isCurrentlyCode = (wrapClass) ? wrapClass.includes(codeblockClass) : false

      if (isCodeBlock && !isCurrentlyCode) {
        // We should render as code
        cm.addLineClass(i, 'wrap', codeblockClass)
        needsRefresh = true
      } else if (!isCodeBlock && isCurrentlyCode) {
        // We should not render as code
        cm.removeLineClass(i, 'wrap', codeblockClass)
        needsRefresh = true
      }
    }

    // End operation (apply the buffer to the layouting and force a repaint)
    cm.endOperation()

    // If at least one line was altered, we need a refresh
    if (needsRefresh) cm.refresh()
  }
})
