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

import CodeMirror, { commands, Pass } from 'codemirror'
import { getListTokenRE } from '@common/regular-expressions'

const listRE = getListTokenRE()

/**
 * Goes to the start of the line, but takes into account list formatting
 * characters (so that the cursor initially only lands *after* the character).
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 */
;(commands as any).goLineLeftMarkdown = function (cm: CodeMirror.Editor) {
  if ((cm as any).getOption('disableInput') === true) {
    return Pass
  }

  // Get the cursor position before executing the command
  const cursorBefore = Object.assign({}, cm.getCursor())
  const line = cm.getLine(cursorBefore.line)

  // Then call the underlying CodeMirror command
  cm.execCommand('goLineLeft')

  // Then, let's see if we're in a list. If the cursor beforehand was to the
  // left of the list marker, and afterwards is at the beginning of the line, we
  // back up the cursor just after the list marker
  const match = listRE.exec(line)

  // Now let's retrieve the cursor position after the command ran
  const cursorAfter = Object.assign({}, cm.getCursor())

  if (cm.somethingSelected() || match === null) {
    return
  }

  // The listRE matched, so now we can check for where the cursor actually
  // is.
  const leadingWhite = match[1].length ?? 0
  const tokenLength = match[2].length ?? 0
  const afterWhite = match[4].length ?? 0

  const startOfItem = leadingWhite + tokenLength + afterWhite

  if (cursorBefore.ch > startOfItem && cursorAfter.ch <= startOfItem) {
    // We are in a list and we also are more to the right than the start of
    // the item, so move to that.
    cm.extendSelection({ line: cursorBefore.line, ch: startOfItem })
  }
}
