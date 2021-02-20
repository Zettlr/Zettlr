/* global CodeMirror define */
// This plugin selects a word under the cursor. Intended for use with Markdown.

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

  CodeMirror.commands.selectWordUnderCursor = function (cm) {
    // Don't overwrite selections.
    if (cm.somethingSelected()) return

    let cur = cm.getCursor()
    let sel = cm.findWordAt(cur)
    // Now we have a word at this position. We only have one problem: CodeMirror
    // does not accept apostrophes (') to be inside words. Therefore, a lot of
    // languages do have problems (I'm looking at you, French). Therefore check
    // two conditions: First: There's an apostrophe and a letter directly in
    // front of this selection - or behind it!
    let line = cm.getLine(sel.anchor.line)
    if (sel.anchor.ch >= 2 && /[^\s]'/.test(line.substr(sel.anchor.ch - 2, 2))) {
      // There's a part of the word in front of the current selection ->
      // move back until we found it.
      do {
        sel.anchor.ch--
      } while (sel.anchor.ch >= 0 && !/\s/.test(line.substr(sel.anchor.ch, 1)))

      if (line[sel.anchor.ch] === ' ') sel.anchor.ch++
    }

    // Now the same for the back
    if (sel.head < line.length - 1 && /'[^\s]/.test(line.substr(sel.head.ch, 2))) {
      do {
        sel.head.ch++
      } while (sel.head <= line.length && !/\s/.test(line.substr(sel.head.ch, 1)))
      if (line[sel.head.ch] === ' ') sel.head.ch--
    }

    // Last but not least check for formatting marks at the beginning or end
    let formatting = '_*[](){}'.split('')
    while (formatting.includes(line.substr(sel.anchor.ch, 1)) && sel.anchor.ch < sel.head.ch) sel.anchor.ch++
    while (formatting.includes(line.substr(sel.head.ch - 1, 1)) && sel.head.ch > sel.anchor.ch) sel.head.ch--

    // Now we should be all set.
    cm.setSelection(sel.anchor, sel.head)
  }
})
