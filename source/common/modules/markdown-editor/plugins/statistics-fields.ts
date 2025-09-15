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
import { StateField, type EditorState } from '@codemirror/state'
import { markdownToAST } from '@common/modules/markdown-utils'
import { countAll } from '@common/util/counter'

export const countField = StateField.define<{ chars: number, words: number }>({
  create (state: EditorState) {
    const ast = markdownToAST(state.doc.toString())
    const locale: string = window.config.get('appLang')
    return countAll(ast, locale)
  },

  update (value, transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }
    const ast = markdownToAST(transaction.state.doc.toString(), syntaxTree(transaction.state))
    const locale: string = window.config.get('appLang')
    return countAll(ast, locale)
  },

  compare (a, b): boolean {
    return a.chars === b.chars && a.words === b.words
  }
})
