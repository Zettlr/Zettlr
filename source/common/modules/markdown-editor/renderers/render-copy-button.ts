/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        LinkRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can render links and URLs.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'

class CopyButtonWidget extends WidgetType {
  constructor (readonly nodeContents: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: CopyButtonWidget): boolean {
    return other.node === this.node &&
    other.nodeContents === this.nodeContents
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    let text = elem.appendChild(document.createElement('span'))
    text.textContent = this.nodeContents
    let copyButton = elem.appendChild(document.createElement('button'))
    copyButton.innerText = 'copy'

    copyButton.addEventListener('click', (event) => {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      navigator.clipboard.writeText(text.textContent !== null ? text.textContent : '')
    })
    return elem
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return ['CodeText'].includes(node.type.name)
}

function createWidget (state: EditorState, node: SyntaxNodeRef): CopyButtonWidget|undefined {
  if (node.type.name === 'CodeText') {
    return new CopyButtonWidget(state.sliceDoc(node.from, node.to), node.node)
  }
}

export const renderCodeCopyButton = renderBlockWidgets(shouldHandleNode, createWidget)
