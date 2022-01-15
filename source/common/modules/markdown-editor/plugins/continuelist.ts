// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: https://codemirror.net/LICENSE
//
// This is the Zettlr fork of addon/edit/continuelist.
// Changes:
//
// + Adapt paths for use within Zettlr
// + Remove the blockquote character (>) from the list regex.

import CodeMirror, { commands } from 'codemirror'
import { getListUnorderedRE, getListEmptyRE, getListRE } from '@common/regular-expressions'
const listRE = getListRE()
const emptyListRE = getListEmptyRE()
const unorderedListRE = getListUnorderedRE()

/**
 * Declares the newlineAndIndentContinueMarkdownList command
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
;(commands as any).newlineAndIndentContinueMarkdownList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) return CodeMirror.Pass
  let ranges = cm.listSelections()
  let replacements = []
  for (let i = 0; i < ranges.length; i++) {
    let pos = ranges[i].head
    // If we're not in Markdown mode, fall back to normal newlineAndIndent
    let eolState = cm.getStateAfter(pos.line)
    let mode = cm.getMode()
    if ((mode as any).innerMode !== undefined) {
      mode = (cm.getMode() as any).innerMode(eolState)
    }

    // Modes can either be just strings or objects with a name property
    let modeName = ((mode as any).mode !== undefined) ? (mode as any).mode.name : mode.name

    // innerMode gets the first inner mode, i.e.:
    // multiplex -> spellchecker (not visible the
    // underyling md mode)
    if (modeName !== 'spellchecker') {
      cm.execCommand('newlineAndIndent')
      return
    } else {
      eolState = (mode as any).state
    }

    const inList = eolState.list !== false
    const inQuote = eolState.quote !== 0

    let line = cm.getLine(pos.line)
    let match = listRE.exec(line)
    const cursorBeforeBullet = /^\s*$/.test(line.slice(0, pos.ch))
    if (!ranges[i].empty() || (!inList && !inQuote) || match === null || cursorBeforeBullet) {
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
      let numbered = !(unorderedListRE.test(match[2]) || match[2].includes('>'))
      let bullet = numbered ? (parseInt(match[3], 10) + 1).toString() + match[4] : match[2].replace('x', ' ')
      replacements[i] = '\n' + indent + bullet + after

      if (numbered) incrementRemainingMarkdownListNumbers(cm, pos)
    }
  }

  cm.replaceSelections(replacements)
}

// Auto-updating Markdown list numbers when a new item is added to the
// middle of a list
function incrementRemainingMarkdownListNumbers (cm: CodeMirror.Editor, pos: CodeMirror.Position): void {
  let startLine = pos.line
  let lookAhead = 0
  let skipCount = 0
  let startItem = listRE.exec(cm.getLine(startLine))
  let startIndent = startItem?.[1] ?? ''

  let nextItem
  do {
    lookAhead += 1
    let nextLineNumber = startLine + lookAhead
    let nextLine = cm.getLine(nextLineNumber)
    nextItem = listRE.exec(nextLine)

    if (nextItem !== null) {
      let nextIndent = nextItem[1]
      let newNumber = (parseInt(startItem?.[3] ?? '0', 10) + lookAhead - skipCount)
      let nextNumber = (parseInt(nextItem[3], 10))
      let itemNumber = nextNumber

      if (startIndent === nextIndent && !isNaN(nextNumber)) {
        if (newNumber === nextNumber) itemNumber = nextNumber + 1
        if (newNumber > nextNumber) itemNumber = newNumber + 1
        cm.replaceRange(
          nextLine.replace(listRE, nextIndent + itemNumber.toString() + nextItem[4] + nextItem[5]),
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
  } while (nextItem !== null)
}
