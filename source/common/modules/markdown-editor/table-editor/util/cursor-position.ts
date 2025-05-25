/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        getCursorPosition function
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function returns the proper caret position of an element.
 *
 * END HEADER
 */

/**
 * Calculates the position of the caret in the given DOM element.
 *
 * @param   {ParentNode}  elem  The element for which to compute the caret position
 *
 * @return  {number}            The caret position
 */
export function getCursorPosition (elem: ParentNode): number {
  let caretPos = 0
  let sel
  let range

  sel = window.getSelection()
  if (sel !== null && sel.rangeCount > 0) {
    range = sel.getRangeAt(0)
    if (range.commonAncestorContainer.parentNode === elem) {
      caretPos = range.endOffset
    }
  }

  return caretPos
}
