/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown backtick pairing
 * CVM-Role:        CodeMirror extension
 * Maintainer:      Zettlr contributors
 * License:         GNU GPL v3
 *
 * Description:     Allows pairing backticks outside fenced code blocks.
 *
 * END HEADER
 */

import { markdownLanguage } from '@codemirror/lang-markdown'
import { syntaxTree } from '@codemirror/language'
import { EditorState } from '@codemirror/state'

/**
 * Extend CodeMirror's default bracket pairs for Markdown, while leaving fenced
 * blocks to their own language data. Otherwise typing a closing fence can add
 * an unwanted fourth backtick.
 */
export const markdownBacktickPairing = EditorState.languageData.of((state, position) => {
  if (!markdownLanguage.isActiveAt(state, position, -1)) {
    return []
  }

  let node = syntaxTree(state).resolveInner(position, -1)
  while (node.name !== 'FencedCode' && node.parent !== null) {
    node = node.parent
  }
  if (node.name === 'FencedCode') {
    return []
  }

  return [{ closeBrackets: { brackets: [ '(', '[', '{', "'", '"', '`' ] } }]
})
