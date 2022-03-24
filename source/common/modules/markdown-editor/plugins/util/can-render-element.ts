/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        canRenderElement
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can check if you can render a preview element
 *                  at the provided position
 *
 * END HEADER
 */

import { Editor, Position } from 'codemirror'

/**
 * Given the provided positions, this function returns true if you are free to
 * render an element there
 *
 * @param   {Editor}    cm    The editor instance
 * @param   {Position}  from  The beginning position
 * @param   {Position}  to    The ending position
 *
 * @return  {boolean}         Returns true if you can render an element there
 */
export default function canRenderElement (cm: Editor, from: Position, to: Position): boolean {
  // Check if the cursor is within the range
  const cursor = cm.getCursor('head')
  if (cursor.line === from.line && cursor.ch >= from.ch && cursor.ch <= to.ch) {
    return false
  }

  // We can only have one marker at any given position at any given time
  if (cm.findMarks(from, to).length > 0) {
    return false
  }

  // We cannot render an element within a comment. This is the final check since
  // it is quite expensive to compute
  const tokenTypeBegin = cm.getTokenTypeAt(from)
  const tokenTypeEnd = cm.getTokenTypeAt(to)
  if (tokenTypeBegin?.includes('comment') || tokenTypeEnd?.includes('comment')) {
    return false
  }

  return true
}
