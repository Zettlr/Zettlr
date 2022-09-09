// Utilizing a ReplaceDecorator, we're here rendering stuff.

// The renderers are adapted from the example here:
// https://codemirror.net/examples/decoration/#boolean-toggle-widgets
import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'

class TaskWidget extends WidgetType {
  constructor (readonly isChecked: boolean, readonly node: SyntaxNode) {
    super()
  }

  eq (other: TaskWidget) {
    return other.isChecked === this.isChecked &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('input')
    elem.setAttribute('type', 'checkbox')
    elem.checked = this.isChecked
    elem.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const insert = this.isChecked ? '[ ]' : '[x]'
      view.dispatch({ changes: [{ from: this.node.from, to: this.node.to, insert }] })
    })
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef) {
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
