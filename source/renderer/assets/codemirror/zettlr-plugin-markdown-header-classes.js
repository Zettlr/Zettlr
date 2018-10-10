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
    let line = ''
    for (let i = 0; i < cm.lineCount(); i++) {
      if (cm.getModeAt({ 'line': i, 'ch': 0 }).name !== 'markdown') continue
      // First remove all header styles
      cm.removeLineClass(i, 'text', 'size-header-1')
      cm.removeLineClass(i, 'text', 'size-header-2')
      cm.removeLineClass(i, 'text', 'size-header-3')
      cm.removeLineClass(i, 'text', 'size-header-4')
      cm.removeLineClass(i, 'text', 'size-header-5')
      cm.removeLineClass(i, 'text', 'size-header-6')

      // Then re-add them as necessary.
      line = cm.getLine(i)
      if (/^# /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-1')
      } else if (/^## /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-2')
      } else if (/^### /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-3')
      } else if (/^#### /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-4')
      } else if (/^##### /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-5')
      } else if (/^###### /.test(line)) {
        cm.addLineClass(i, 'text', 'size-header-6')
      }
    }
  }
})
