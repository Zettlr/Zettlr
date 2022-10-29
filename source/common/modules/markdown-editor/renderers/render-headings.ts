/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        HeadingRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can display and pre-render headings.
 *
 * END HEADER
 */

import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'

class HeadingTagWidget extends WidgetType {
  constructor (readonly level: number, readonly node: SyntaxNode) {
    super()
  }

  eq (other: HeadingTagWidget): boolean {
    return other.level === this.level &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('div')
    elem.classList.add('heading-tag')
    const span = document.createElement('span')
    span.textContent = `h${this.level}`
    elem.appendChild(span)
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name.startsWith('HeaderMark')
}

function createWidget (state: EditorState, node: SyntaxNodeRef): HeadingTagWidget|undefined {
  // For now we only support ATX headings, BUT in the future thanks to the fact
  // that Setext headings are also marked, we could definitely make that much
  // nicer as well
  if (!state.sliceDoc(node.from, node.to).includes('#')) {
    return undefined
  }

  // Somehow the parser also detects rogue # signs as heading marks
  const startOfLine = state.doc.lineAt(node.from).from === node.from
  if (!startOfLine) {
    return undefined
  }

  return new HeadingTagWidget(node.to - node.from, node.node)
}

export const renderHeadings = renderInlineWidgets(shouldHandleNode, createWidget)
