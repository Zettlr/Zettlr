/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Click and Select Utility
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This function can be used by renderers to enable an easy way
 *                  to select the source code behind rendered widgets.
 *
 * END HEADER
 */

import { type EditorView } from '@codemirror/view'

/**
 * A helper function that returns a click-callback that can be used to set a
 * selection encompassing the full node (in effect removing the widget and
 * selecting all of its replaced text).
 *
 * @param   {EditorView}  view   The editor view
 *
 * @return  {Function}           A callback compatible with mouse events
 */
export default function clickAndSelect (view: EditorView): (event: MouseEvent) => void {
  return function (event: MouseEvent) {
    const { target } = event
    if (!(target instanceof HTMLElement)) {
      return
    }

    // The thing we're clicking on may span multiple lines in the editor; for
    // example, clicking on a citation that has a (soft) line-wrap in the middle
    // of the rendered text.
    //
    // Grabbing the `getBoundingClientRect` is too coarse in such cases because
    // the selection will span the *entirety* of both lines rather than just the
    // text of the rendered citation (in this example).
    //
    // So, we need to find the *smallest* rectangle that applies in the list of
    // all possible rectangles for the target; continuing with the citation
    // example, clicking on a citation that has a (soft) line-wrap in the middle
    // of the rendered text *must* only select (highlight) the rectangle of the
    // citation text itself.
    const rects = target.getClientRects()
    let fromPos = null
    let toPos = null

    for (const rect of rects) {
      const startPos = view.posAtCoords({ x: rect.left, y: rect.top })
      const endPos = view.posAtCoords({ x: rect.right, y: rect.bottom })

      if (startPos !== null && (fromPos === null || startPos < fromPos)) {
        fromPos = startPos
      }
      if (endPos !== null && (toPos === null || endPos > toPos)) {
        toPos = endPos
      }
    }

    if (fromPos === null || toPos === null) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    view.dispatch({ selection: { anchor: fromPos, head: toPos } })
  }
}
