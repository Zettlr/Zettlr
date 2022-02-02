// CodeMirror, copyright (c) by Marijn Haverbeke and others
// Distributed under an MIT license: http://codemirror.net/LICENSE

/*
 * THIS ADDON HAS BEEN DRAWN FROM THE CODEMIRROR-MARKDOWN-LIST-AUTOINDENT PLUGIN
 * TO PREVENT FURTHER ANNOYING ERRORS IN BUILT PACKAGES B/C THE POSTINSTALL
 * SCRIPT MORE OFTEN THAN NOT DOESN'T RUN CORRECTLY.
 *
 * See original repository at https://github.com/joel-porquet/CodeMirror-markdown-list-autoindent
 */

import CodeMirror, { Pos, commands, Pass } from 'codemirror'
import { getListTokenRE } from '@common/regular-expressions'

const listTokenRE = getListTokenRE()

function matchListToken (pos: CodeMirror.Position, cm: CodeMirror.Editor): boolean {
  /* Get some info about the current state */
  const eolState = cm.getStateAfter(pos.line)
  const inList = eolState.list !== false
  const inQuote = eolState.quote !== 0

  /* Get the line from the start to where the cursor currently is */
  const lineStart = cm.getRange(Pos(pos.line, 0), pos)

  /* Matches the beginning of the list line with the list token RE */
  const match = listTokenRE.exec(lineStart)

  /* Not being in a list, or being in a list but not right after the list
    * token, are both not considered a match */
  if ((!inList && !inQuote) || match === null) {
    return false
  } else {
    return true
  }
}

/**
 * Automatically indents a Markdown list if applicable
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 *
 * @return  {undefined|CodeMirror.Pass}      The command return
 */
;(commands as any).autoIndentMarkdownList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  const ranges = cm.listSelections()
  for (let i = 0; i < ranges.length; i++) {
    const pos = ranges[i].head

    if (!ranges[i].empty() || !matchListToken(pos, cm)) {
      /* If no match, call regular Tab handler */
      cm.execCommand('indentMore')
    } else {
      /* Select the whole list line and indent it by one unit */
      cm.indentLine(pos.line, 'add')
    }
  }
}

/**
 * Automatically unindents a Markdown list if applicable
 *
 * @param   {CodeMirror.Editor}  cm  The CodeMirror instance
 *
 * @return  {undefined|CodeMirror.Editor.Pass}      The command return
 */
;(commands as any).autoUnindentMarkdownList = function (cm: CodeMirror.Editor) {
  if (cm.isReadOnly()) {
    return Pass
  }

  const ranges = cm.listSelections()
  for (let i = 0; i < ranges.length; i++) {
    const pos = ranges[i].head

    if (!ranges[i].empty() || !matchListToken(pos, cm)) {
      /* If no match, call regular Shift-Tab handler */
      cm.execCommand('indentLess')
    } else {
      /* Select the whole list line and unindent it by one unit */
      cm.indentLine(pos.line, 'subtract')
    }
  }
}
