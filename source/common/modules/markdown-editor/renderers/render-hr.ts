/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        RuleRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays horizontal rules.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { WidgetType } from '@codemirror/view'

import { type EditorState } from '@codemirror/state'
import { rangeInSelection } from '../util/range-in-selection'

class RuleWidget extends WidgetType {
  constructor (readonly node: SyntaxNode) {
    super()
  }

  eq (other: RuleWidget): boolean {
    return other.node.from === this.node.from && other.node.to === this.node.to
  }

  toDOM (): HTMLElement {
    return document.createElement('hr')
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'HorizontalRule'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): RuleWidget|undefined {
  // Get the node's text contents, determine if this is a displayMode equation,
  // and then remove the leading and trailing dollars. Also, pass a stable node
  // reference (SyntaxNodeRef will be dropped, but the SyntaxNode itself will
  // stay, and keep its position updated depending on what happens in the doc)

  // Horizontal rules must always show their syntax even if the cursor is only
  // adjacent for a proper UX. If we didn't do that, users would have to click
  // within this element to show the heading characters, which is undesirable.
  if (rangeInSelection(state.selection, node.from, node.to, true)) {
    return undefined
  }

  return new RuleWidget(node.node)
}

export const renderHorizontalRules = [
  renderBlockWidgets(shouldHandleNode, createWidget)
]
