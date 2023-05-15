/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Statistics Field
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file defines a set of StateFields that are used to keep
 *                  a few statistics such as word counts available to the
 *                  overlying MarkdownEditor instance.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { StateField, type EditorState, type Transaction } from '@codemirror/state'
import { markdownToAST } from '@common/modules/markdown-utils'
import { countAll } from '@common/util/counter'

export const countField = StateField.define<{ chars: number, words: number }>({
  create (state: EditorState): { chars: number, words: number } {
    const ast = markdownToAST(state.doc.toString())
    return countAll(ast)
  },

  update (value: { chars: number, words: number }, transaction: Transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }

    const ast = markdownToAST(transaction.state.doc.toString(), syntaxTree(transaction.state))
    return countAll(ast)
  },

  compare (a: { chars: number, words: number }, b: { chars: number, words: number }): boolean {
    return a.chars === b.chars && a.words === b.words
  }
})
