/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Functions to expand the range of a selection
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a set of functions to expand a selection
 *                  range.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type EditorState } from '@codemirror/state'
import type { Tree, TreeCursor } from '@lezer/common'

export type Range = { from: number, to: number }

/**
 * This function takes a range and expands it to the nearest
 * word boundary before `from` and after `to`
 *
 * @param   {EditorState} state    The Editor State
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of positions before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest word boundaries
 */
export function getWordPosition (state: EditorState, from: number, to: number, context: number = 0): Range {
  const totalChars = state.doc.length

  const fromWordNum = Math.max(0, from - context)
  const toWordNum = Math.min(totalChars, to + context)

  const fromWord = state.wordAt(fromWordNum)
  const toWord = state.wordAt(toWordNum)

  const wordFrom: number = fromWord ? fromWord.from : fromWordNum
  const wordTo: number = toWord ? toWord.to : toWordNum

  return { from: wordFrom, to: wordTo }
}

/**
 * This function takes a range and expands it to the nearest
 * line boundary before `from` and after `to`.
 *
 * @param   {EditorState} state    The Editor State
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of lines before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest line boundaries
 */
export function getLinePosition (state: EditorState, from: number, to: number, context: number = 0): Range {
  const totalLines = state.doc.lines

  const fromLineNum = Math.max(1, state.doc.lineAt(from).number - context)
  const toLineNum = Math.min(totalLines, state.doc.lineAt(to).number + context)

  const fromLine = state.doc.line(fromLineNum)
  const toLine = state.doc.line(toLineNum)

  return { from: fromLine.from, to: toLine.to }
}

/**
 * This function takes a range and expands it to the nearest
 * block boundary before `from` and after `to`
 *
 * @param   {EditorState} state    The Editor State
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of blocks before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest block boundaries
 */
export function getBlockPosition (state: EditorState, from: number, to: number, context: number = 0): Range {
  const totalLines = state.doc.lines
  let fromLineNum = state.doc.lineAt(from).number
  let toLineNum = state.doc.lineAt(to).number

  // we expand the context to the top of the previous block
  let prevBlock: boolean = false
  let nextBlock: boolean = false
  let currentBlock: boolean = true
  let blocks: number = 0

  while (fromLineNum > 1) {
    if (state.doc.line(fromLineNum - 1).text.trim() === '') {
      // we hit a newline, so we are no longer in the starting block
      currentBlock = false
      // we hit the top of the previous block
      if (prevBlock) {
        break
      }
    // if we aren't in the current block and hit text,
    // it means we are now in the previous block
    } else if (!currentBlock) {
      if (blocks >= context) {
        prevBlock = true
      } else {
        blocks++
        currentBlock = true
      }
    }
    fromLineNum--
  }

  // we expand the context to the bottom of the next block
  currentBlock = true
  blocks = 0
  while (toLineNum < totalLines) {
    if (state.doc.line(toLineNum + 1).text.trim() === '') {
      // we hit a newline, so we are no longer in the starting block
      currentBlock = false
      // we hit the bottom of the next block
      if (nextBlock) {
        break
      }
    // if we aren't in the current block and hit text,
    // it means we are now in the next block
    } else if (!currentBlock) {
      if (blocks >= context) {
        nextBlock = true
      } else {
        blocks++
        currentBlock = true
      }
    }
    toLineNum++
  }

  const blockFrom = state.doc.line(fromLineNum).from
  const blockTo = state.doc.line(toLineNum).to

  return { from: blockFrom, to: blockTo }
}

/**
 * This function takes a range and expands it to the nearest
 * node boundary before `from` and after `to`
 *
 * @param   {EditorState} state    The Editor State
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of nodes before `from` and after `to`
 * @param   {Tree}        [tree]   Optional. A pre-computed Tree object.
 *
 * @return  {Range}                The selection expanded to the nearest node boundaries
 */
export function getNodePosition (state: EditorState, from: number, to: number, context: number = 0, filter?: Set<string>, tree?: Tree): Range {
  tree = tree ?? syntaxTree(state)

  const start: number = Math.min(from, to)
  const end: number = Math.max(from, to)

  const cursorA: TreeCursor = tree.topNode.cursor()
  if (!cursorA.childBefore(start)) {
    cursorA.firstChild()
  }
  while (!filter || !filter.has(cursorA.node.name)) {
    if (!cursorA.parent()) { break }
  }

  const cursorB: TreeCursor = tree.topNode.cursor()
  if (!cursorB.childAfter(end)) {
    cursorB.lastChild()
  }
  while (!filter || !filter.has(cursorB.node.name)) {
    if (!cursorB.parent()) { break }
  }

  while (context-- > 0) {
    while (cursorA.prevSibling() && (!filter || !filter.has(cursorA.node.name))) {
      if (!cursorA.parent()) { break }
    }
    while (cursorB.nextSibling() && (!filter || !filter.has(cursorB.node.name))) {
      if (!cursorB.parent()) { break }
    }
  }

  return { from: cursorA.from, to: cursorB.to }
}

/**
 * Test whether a range overlaps any range in a list of ranges.
 *
 * @param   {Range}    r       The range to test
 * @param   {Range[]}  ranges  A list of ranges to test against
 *
 * @return  {boolean}          Whether the range overlaps any range in ranges.
 */
export function rangesOverlap (r: Range, ranges: Range[]): boolean {
  return ranges.some(range => {
    // zero-width range
    if (r.from === r.to) {
      // only count as overlap if range actually contains the point r.from
      return r.from < range.to && r.to > range.from
    }
    return !(r.to < range.from || r.from > range.to)
  })
}

/**
 * Merge overlapping ranges in a list of ranges
 *
 * @param   {Range[]}  ranges  A list of { from, to } ranges.
 *
 * @return  {Range[]}          A new list of merged ranges.
 */
export function mergeRanges (ranges: Range[]): Range[] {
  if (ranges.length <= 1) {
    return [...ranges]
  }

  const sorted = [...ranges].sort((a, b) => a.from - b.from)
  const merged: Range[] = [{ ...sorted[0] }]

  for (let i = 1; i < sorted.length; i++) {
    const prev = merged[merged.length - 1]
    const next = sorted[i]

    if (next.from <= prev.to + 1) {
      prev.to = Math.max(prev.to, next.to)
    } else {
      merged.push({ ...next })
    }
  }

  return merged
}
