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
    // Clicking on a citation that has a (soft) line-wrap in the middle of the
    // rendered text *must* only select (highlight) the rectangle of the
    // citation text itself.

    const rects = Array.from(target.getClientRects())

    if (rects.length === 0) {
      return
    }

    const { top, left, bottom, right } = (rects.length === 1)
      // when there's just the one rectangle, use it's coords
      ? {
        top: rects.at(0).top,
        left: rects.at(0).left,
        bottom: rects.at(0).bottom,
        right: rects.at(0).right
      }
      // when there are multiple rectangles, use the first and last for the coords
      : {
        top: rects.at(0).top,
        left: rects.at(0).left,
        bottom: rects.at(-1).bottom,
        right: rects.at(-1).right
      }

    const fromPos = view.posAtCoords({ x: left, y: top })
    const toPos = view.posAtCoords({ x: right, y: bottom })

    if (fromPos === null || toPos === null) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    view.dispatch({ selection: { anchor: fromPos, head: toPos } })
  }
}
