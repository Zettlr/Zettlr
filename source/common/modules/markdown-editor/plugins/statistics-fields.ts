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

import { StateField, type EditorState, type Text } from '@codemirror/state'
import { markdownToAST } from '@common/modules/markdown-utils'
import { countAll } from '@common/util/counter'
import { getNodePosition } from '../util/expand-selection'
import { syntaxTree } from '@codemirror/language'

const SINGLE_CHARACTER = /^\p{L}$|^\p{N}$/u

function countLineChanges (text: Text, from: number, to: number): { words: number, chars: number } {
  // we need to grab the entire line so that words
  // are counted. Otherwise, we would only count single characters
  // since we operate after every transaction.
  const start: number = text.lineAt(from).from
  const end: number = text.lineAt(to).to
  const content: string = text.toString()

  let counts = countAll(markdownToAST(content), start, end)

  // we have to account for single character words.
  if (counts.words === 0 && SINGLE_CHARACTER.test(content.trim())) {
    counts = { words: 1, chars: 1 }
  }

  return counts
}

const TEXTNODES = new Set([
  'Paragraph',
  'Blockquote',
])

export const countField = StateField.define<{ chars: number, words: number }>({
  create (state: EditorState) {
    const ast = markdownToAST(state.doc.toString())
    return countAll(ast)
  },

  update (value, transaction) {
    // If someone provided the markClean effect, we'll exchange the saved doc
    // so that, when comparing documents with cleanDoc.eq(state.doc), it will
    // return true.
    if (!transaction.docChanged) {
      return value
    }

    let { words, chars } = value

    const treeA = syntaxTree(transaction.startState)
    const treeB = syntaxTree(transaction.state)

    const invertedChanges = transaction.changes.invertedDesc

    transaction.changes.iterChangedRanges((fromA, toA, fromB, toB) => {
      // we expand the context to ensure a better lint
      const nodeRangeA = getNodePosition(transaction.startState, fromA, toA, 1, TEXTNODES, treeA)
      const nodeRangeB = getNodePosition(transaction.state, fromB, toB, 1, TEXTNODES, treeB)

      // since the nodes may no longer align, we need to map them
      // both ways across the transaction
      const mappedA = {
        from: invertedChanges.mapPos(nodeRangeB.from),
        to: invertedChanges.mapPos(nodeRangeB.to)
      }
      const mappedB = {
        from: transaction.changes.mapPos(nodeRangeA.from),
        to: transaction.changes.mapPos(nodeRangeA.to)
      }
      // we now have four ranges, but we only need two
      // so we take the largest available range
      if (mappedA.from > nodeRangeA.from) {
        mappedA.from = nodeRangeA.from
      }
      if (mappedA.to < nodeRangeA.to) {
        mappedA.to = nodeRangeA.to
      }
      if (mappedB.from > nodeRangeB.from) {
        mappedB.from = nodeRangeB.from
      }
      if (mappedB.to < nodeRangeB.to) {
        mappedB.to = nodeRangeB.to
      }

      // again, since we expanded the ranges, we need to
      // ensure they encompass an entire node.
      const nodeA = getNodePosition(transaction.startState, mappedA.from, mappedA.to, 1, TEXTNODES, treeA)
      const nodeB = getNodePosition(transaction.state, mappedB.from, mappedB.to, 1, TEXTNODES, treeB)

      const textA = transaction.startState.doc.slice(nodeA.from, nodeA.to)
      const textB = transaction.state.doc.slice(nodeB.from, nodeB.to)

      const sliceOffsetA = {
        from: mappedA.from - nodeA.from,
        to: Math.min(mappedA.to - nodeA.from, textA.length)
      }
      const sliceOffsetB = {
        from: mappedB.from - nodeB.from,
        to: Math.min(mappedB.to - nodeB.from, textB.length)
      }

      const beforeCount = countLineChanges(textA, sliceOffsetA.from, sliceOffsetA.to)
      const afterCount = countLineChanges(textB, sliceOffsetB.from, sliceOffsetB.to)

      // ensure no negative word and character counts
      words = Math.max(words - beforeCount.words, 0) + afterCount.words
      chars = Math.max(chars - beforeCount.chars, 0) + afterCount.chars
    })

    return { words, chars }
  },

  compare (a, b): boolean {
    return a.chars === b.chars && a.words === b.words
  }
})
