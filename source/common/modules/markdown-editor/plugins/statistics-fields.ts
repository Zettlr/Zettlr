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

import { EditorState, StateField, Transaction } from '@codemirror/state'
import countWords from '@common/util/count-words'

export const wordCountField = StateField.define<number>({
  create (state: EditorState): number {
    let content = ''
    for (const line of state.doc.iter()) {
      content += line
    }
    return countWords(content, false)
  },

  update (value: number, transaction: Transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }

    let content = ''
    for (const line of transaction.newDoc.iter()) {
      content += line
    }
    return countWords(content, false)
  },

  compare (a: number, b: number): boolean {
    return a === b
  }
})

export const charCountField = StateField.define<number>({
  create (state: EditorState): number {
    let content = ''
    for (const line of state.doc.iter()) {
      content += line
    }
    return countWords(content, true)
  },

  update (value: number, transaction: Transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }

    let content = ''
    for (const line of transaction.newDoc.iter()) {
      content += line
    }
    return countWords(content, true)
  },

  compare (a: number, b: number): boolean {
    return a === b
  }
})

export const charCountNoSpacesField = StateField.define<number>({
  create (state: EditorState): number {
    let content = ''
    for (const line of state.doc.iter()) {
      content += line
    }
    return countWords(content, 'nospace')
  },

  update (value: number, transaction: Transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }

    let content = ''
    for (const line of transaction.newDoc.iter()) {
      content += line
    }
    return countWords(content, 'nospace')
  },

  compare (a: number, b: number): boolean {
    return a === b
  }
})

export const mdStatistics = [
  wordCountField,
  charCountField,
  charCountNoSpacesField
]
