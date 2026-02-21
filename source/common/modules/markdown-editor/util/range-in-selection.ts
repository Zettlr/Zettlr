/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        rangeInSelection
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     A small function that checks if a given range is touched by
 *                  any selection within a CodeMirror 6 editor.
 *
 * END HEADER
 */

import type { EditorSelection } from '@codemirror/state'

/**
 * Checks if any of the selections within the given EditorState has overlap with
 * the provided range.
 *
 * @param   {EditorSelection}   selection         The selection(s) to test
 * @param   {number}            rangeFrom         The range start
 * @param   {number}            rangeTo           The range end
 * @param   {boolean}           includeAdjacent   Whether to count adjacent
 *                                                selections, or only wholly
 *                                                contained selections
 *                                                (default: false).
 *
 * @return  {boolean}                             True if any selection overlaps
 */
export function rangeInSelection (
  selection: EditorSelection,
  rangeFrom: number,
  rangeTo: number,
  includeAdjacent: boolean = false
): boolean {
  if (includeAdjacent) {
    return !selection.ranges.some(range => range.to < rangeFrom || range.from > rangeTo)
  } else {
    return !selection.ranges.some(range => range.to <= rangeFrom || range.from >= rangeTo)
  }
}
