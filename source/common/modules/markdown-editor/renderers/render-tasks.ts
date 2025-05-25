/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        TaskRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays task lists
 *
 * END HEADER
 */

import { renderInlineWidgets } from './base-renderer'
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'

class TaskWidget extends WidgetType {
  constructor (readonly isChecked: boolean, readonly node: SyntaxNode) {
    super()
  }

  eq (other: TaskWidget): boolean {
    return other.isChecked === this.isChecked &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('input')
    elem.setAttribute('type', 'checkbox')
    elem.checked = this.isChecked
    elem.addEventListener('click', (event) => {
      const insert = this.isChecked ? '[ ]' : '[x]'
      view.dispatch({ changes: [{ from: this.node.from, to: this.node.to, insert }] })
      view.contentDOM.focus()
    })
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return event instanceof MouseEvent && event.type === 'mousedown'// Allows clicking on the checkbox without checklist toggling
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'TaskMarker'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): TaskWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const task = state.sliceDoc(node.from, node.to) // Will be either [ ] or [x]
  const isChecked = task !== '[ ]'

  return new TaskWidget(isChecked, node.node)
}

export const renderTasks = renderInlineWidgets(shouldHandleNode, createWidget)
