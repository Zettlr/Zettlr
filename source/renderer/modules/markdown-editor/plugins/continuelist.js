/* global define CodeMirror */
// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
//
// This is the Zettlr fork of addon/edit/continuelist.
// Changes:
//
// + Adapt paths for use within Zettlr
// + Remove the blockquote character (>) from the list regex.

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

  var listRE = /^(\s*)([*+-] \[[x ]\]\s|[*+-]\s|(\d+)([.)]))(\s*)/
  let emptyListRE = /^(\s*)([*+-] \[[x ]\]|[*+-]|(\d+)[.)])(\s*)$/
  let unorderedListRE = /[*+-]\s/

  CodeMirror.commands.newlineAndIndentContinueMarkdownList = function (cm) {
    if (cm.isReadOnly()) return CodeMirror.Pass
    let ranges = cm.listSelections()
    let replacements = []
    for (let i = 0; i < ranges.length; i++) {
      let pos = ranges[i].head
      // If we're not in Markdown mode, fall back to normal newlineAndIndent
      var eolState = cm.getStateAfter(pos.line)
      var inner = cm.getMode().innerMode(eolState)
      // innerMode gets the first inner mode, i.e.:
      // multiplex -> spellchecker (not visible the
      // underyling md mode)
      if (inner.mode.name !== 'spellchecker') {
        cm.execCommand('newlineAndIndent')
        return
      } else {
        eolState = inner.state
      }

      var inList = eolState.list !== false
      var inQuote = eolState.quote !== 0

      let line = cm.getLine(pos.line)
      let match = listRE.exec(line)
      var cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch))
      if (!ranges[i].empty() || (!inList && !inQuote) || !match || cursorBeforeBullet) {
        cm.execCommand('newlineAndIndent')
        return
      }
      if (emptyListRE.test(line)) {
        if (!/>\s*$/.test(line)) {
          cm.replaceRange('', {
            line: pos.line, ch: 0
          }, {
            line: pos.line, ch: pos.ch + 1
          })
          replacements[i] = '\n'
        }
      } else {
        let indent = match[1]
        let after = match[5]
        let numbered = !(unorderedListRE.test(match[2]) || match[2].indexOf('>') >= 0)
        let bullet = numbered ? (parseInt(match[3], 10) + 1) + match[4] : match[2].replace('x', ' ')
        replacements[i] = '\n' + indent + bullet + after

        if (numbered) incrementRemainingMarkdownListNumbers(cm, pos)
      }
    }

    cm.replaceSelections(replacements)
  }

  // Auto-updating Markdown list numbers when a new item is added to the
  // middle of a list
  function incrementRemainingMarkdownListNumbers (cm, pos) {
    let startLine = pos.line
    let lookAhead = 0
    let skipCount = 0
    let startItem = listRE.exec(cm.getLine(startLine))
    let startIndent = startItem[1]

    do {
      lookAhead += 1
      let nextLineNumber = startLine + lookAhead
      let nextLine = cm.getLine(nextLineNumber)
      var nextItem = listRE.exec(nextLine)

      if (nextItem) {
        let nextIndent = nextItem[1]
        let newNumber = (parseInt(startItem[3], 10) + lookAhead - skipCount)
        let nextNumber = (parseInt(nextItem[3], 10))
        let itemNumber = nextNumber

        if (startIndent === nextIndent && !isNaN(nextNumber)) {
          if (newNumber === nextNumber) itemNumber = nextNumber + 1
          if (newNumber > nextNumber) itemNumber = newNumber + 1
          cm.replaceRange(
            nextLine.replace(listRE, nextIndent + itemNumber + nextItem[4] + nextItem[5]),
            {
              line: nextLineNumber, ch: 0
            }, {
              line: nextLineNumber, ch: nextLine.length
            })
        } else {
          if (startIndent.length > nextIndent.length) return
          // This doesn't run if the next line immediatley indents, as it is
          // not clear of the users intention (new indented item or same level)
          if ((startIndent.length < nextIndent.length) && (lookAhead === 1)) return
          skipCount += 1
        }
      }
    } while (nextItem)
  }
})
