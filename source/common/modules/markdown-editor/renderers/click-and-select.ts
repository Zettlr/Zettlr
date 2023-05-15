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

    const { top, left, bottom, right } = target.getBoundingClientRect()
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
