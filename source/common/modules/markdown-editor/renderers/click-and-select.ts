import { EditorView } from '@codemirror/view'
import { SyntaxNode } from '@lezer/common'

/**
 * A helper function that returns a click-callback that can be used to set a
 * selection encompassing the full node (in effect removing the widget and
 * selecting all of its replaced text).
 *
 * @param   {EditorView}  view   The editor view
 * @param   {SyntaxNode}  node   The node whose text to select
 *
 * @return  {Function}           A callback compatible with mouse events
 */
export default function clickAndSelect (view: EditorView, node: SyntaxNode): (event: MouseEvent) => void {
  return function (event: MouseEvent) {
    if (!(event.target instanceof HTMLElement)) {
      return
    }

    event.stopPropagation()
    event.preventDefault()
    view.dispatch({ selection: { anchor: node.from, head: node.to } })
  }
}
