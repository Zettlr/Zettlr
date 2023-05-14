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

import clickAndSelect from './click-and-select'
import { renderBlockWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import { sleep } from '@cds/core/internal'

class CopyButtonWidget extends WidgetType {
  constructor (readonly nodeContents: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: CopyButtonWidget): boolean {
    return other.node === this.node &&
    other.nodeContents === this.nodeContents
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('div')
    elem.style.width = '100%'
    elem.style.position = 'relative'

    let copyButton = elem.appendChild(document.createElement('button'))
    copyButton.innerText = 'Copy'
    copyButton.style.top = '8px'
    copyButton.style.right = '8px'
    copyButton.style.zIndex = '10'
    copyButton.style.position = 'absolute'
    // eslint-disable-next-line @typescript-eslint/no-misused-promises
    copyButton.addEventListener('click', async (event) => {
      event.preventDefault()
      event.stopPropagation()
      await navigator.clipboard.writeText(this.nodeContents !== null ? this.nodeContents : '')
      copyButton.innerText = 'Copied!'
      await sleep(500)
      copyButton.innerText = 'Copy'
    })

    let text = elem.appendChild(document.createElement('span'))
    text.style.padding = '0px'
    text.style.margin = '0px'
    text.style.lineBreak = '0px'
    text.style.width = '100%'
    text.style.display = 'block'
    text.textContent = this.nodeContents
    text.addEventListener('click', clickAndSelect(view, this.node))

    return elem
  }

  ignoreEvent (event: Event): boolean {
    return true // !(event.target instanceof HTMLElement) // By default ignore all events
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
