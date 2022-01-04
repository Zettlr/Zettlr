/* global CodeMirror define */
/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Smart GoLine plugin
 * CVM-Role:        CodeMirror Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This plugin implements a refinement for the goLineLeft
 *                  command. This works on macOS using Cmd+Left. By default,
 *                  CodeMirror will simply move to the very beginning of the
 *                  line. However, there are instances where "go line left"
 *                  means "Do not go to the beginning of the line, but rather
 *                  the beginning of the list item". We need to check this.
 *
 * END HEADER
 */
const { getListTokenRE } = require('@common/regular-expressions');

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

  const listRE = getListTokenRE()

  /**
   * Goes to the start of the line, but takes into account list formatting
   * characters (so that the cursor initially only lands *after* the character).
   *
   * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
   */
  CodeMirror.commands.goLineLeftMarkdown = function (cm) {
    if (cm.getOption('disableInput') === true) {
      return CodeMirror.Pass
    }

    if (cm.somethingSelected()) {
      // Call regular handler
      cm.execCommand('goLineLeft')
      return
    }

    const cur = cm.getCursor()
    const line = cm.getLine(cur.line)

    // First, check for two conditions: We are in a list, and the cursor is
    // farther to the right than the beginning of the list.
    const match = listRE.exec(line)

    if (match === null) {
      cm.execCommand('goLineLeft')
    } else {
      // The listRE matched, so now we can check for where the cursor actually
      // is.
      const leadingWhite = (match[1] !== undefined) ? match[1].length : 0
      const tokenLength = (match[2] !== undefined) ? match[2].length : 0
      const afterWhite = (match[4] !== undefined) ? match[4].length : 0

      const startOfItem = leadingWhite + tokenLength + afterWhite

      if (cur.ch <= startOfItem) {
        // The cursor is either directly at the start of the list item's
        // contents or before that, so simply execute the "goLineLeft" command.
        cm.execCommand('goLineLeft')
      } else {
        // We are in a list and we also are more to the right than the start of
        // the item, so move to that.
        cm.extendSelection({ line: cur.line, ch: startOfItem })
      }
    }
  }
})
