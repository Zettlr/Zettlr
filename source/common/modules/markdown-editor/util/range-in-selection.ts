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

import { type EditorState } from '@codemirror/state'

/**
 * Checks if any of the selections within the given EditorState has overlap with
 * the provided range.
 *
 * @param   {EditorState}  state      The state to draw selections from
 * @param   {number}       rangeFrom  The start position of the range
 * @param   {number}       rangeTo    The end position of the range
 *
 * @return  {boolean}                 True if any selection overlaps
 */
export function rangeInSelection (state: EditorState, rangeFrom: number, rangeTo: number): boolean {
  return state.selection.ranges
    .map(range => [ range.from, range.to ])
    .filter(([ from, to ]) => !(to <= rangeFrom || from >= rangeTo))
    .length > 0
}
