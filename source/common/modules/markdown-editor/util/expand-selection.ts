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
import { type EditorView } from '@codemirror/view'
import type { TreeCursor } from '@lezer/common'

export type Range = { from: number, to: number }

/**
 * This function takes a range and expands it to the nearest
 * word boundary before `from` and after `to`
 *
 * @param   {EditorView}  view     The Editor View
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of positions before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest word boundaries
 */
export function getWordPosition (view: EditorView, from: number, to: number, context: number = 0): Range {
  const totalChars = view.state.doc.length

  const fromWordNum = Math.max(0, from - context)
  const toWordNum = Math.min(totalChars, to + context)

  const fromWord = view.state.wordAt(fromWordNum)
  const toWord = view.state.wordAt(toWordNum)

  const wordFrom: number = fromWord ? fromWord.from : fromWordNum
  const wordTo: number = toWord ? toWord.to : toWordNum

  return { from: wordFrom, to: wordTo }
}

/**
 * This function takes a range and expands it to the nearest
 * line boundary before `from` and after `to`.
 *
 * @param   {EditorView}  view     The Editor View
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of lines before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest line boundaries
 */
export function getLinePosition (view: EditorView, from: number, to: number, context: number = 0): Range {
  const totalLines = view.state.doc.lines

  const fromLineNum = Math.max(1, view.state.doc.lineAt(from).number - context)
  const toLineNum = Math.min(totalLines, view.state.doc.lineAt(to).number + context)

  const fromLine = view.state.doc.line(fromLineNum)
  const toLine = view.state.doc.line(toLineNum)

  return { from: fromLine.from, to: toLine.to }
}

/**
 * This function takes a range and expands it to the nearest
 * block boundary before `from` and after `to`
 *
 * @param   {EditorView}  view     The Editor View
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of blocks before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest block boundaries
 */
export function getBlockPosition (view: EditorView, from: number, to: number, context: number = 0): Range {
  const totalLines = view.state.doc.lines
  let fromLineNum = view.state.doc.lineAt(from).number
  let toLineNum = view.state.doc.lineAt(to).number

  // we expand the context to the top of the previous block
  let prevBlock: boolean = false
  let nextBlock: boolean = false
  let currentBlock: boolean = true
  let blocks: number = 0

  while (fromLineNum > 1) {
    if (view.state.doc.line(fromLineNum - 1).text.trim() === '') {
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
    if (view.state.doc.line(toLineNum + 1).text.trim() === '') {
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

  const blockFrom = view.state.doc.line(fromLineNum).from
  const blockTo = view.state.doc.line(toLineNum).to

  return { from: blockFrom, to: blockTo }
}

/**
 * This function takes a range and expands it to the nearest
 * node boundary before `from` and after `to`
 *
 * @param   {EditorView}  view     The Editor View
 * @param   {number}      from     The beginning of the selection
 * @param   {number}      to       The end of the selection
 * @param   {number}      context  Expand the selection by `context`
 *                                 number of nodes before `from` and after `to`
 *
 * @return  {Range}                The selection expanded to the nearest node boundaries
 */
export function getNodePosition (view: EditorView, from: number, to: number, context: number = 0): Range {
  const tree = syntaxTree(view.state)

  let cursorFrom: TreeCursor = tree.resolve(from, -1).cursor()
  let cursorTo: TreeCursor = tree.resolve(to, 1).cursor()

  let idx = 0
  let prevCursor = cursorFrom
  let nextCursor = cursorTo

  while (idx < context) {
    idx++
    prevCursor.prev(false)
    nextCursor.next(false)
  }

  const nodeFrom = prevCursor.node.from
  const nodeTo = nextCursor.node.to

  return { from: nodeFrom, to: nodeTo }
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
