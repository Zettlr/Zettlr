/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        MermaidRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays mermaid graphs.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'

import mermaid from 'mermaid'
import { type EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'

// Always re-initialize mermaid as soon as the darkMode changes
const ipcRenderer = window.ipc
ipcRenderer.on('config-provider', (event, { command, payload }) => {
  if (command === 'update' && payload === 'darkMode') {
    const isDarkMode = window.config.get('darkMode') as boolean
    const theme = isDarkMode ? 'dark' : 'default'
    mermaid.initialize({ startOnLoad: false, theme })
  }
})

// Initially, set the dark theme
mermaid.initialize({ startOnLoad: false, theme: 'default' })

class MermaidWidget extends WidgetType {
  constructor (readonly graph: string, readonly node: SyntaxNode, readonly darkMode: boolean) {
    super()
  }

  eq (other: MermaidWidget): boolean {
    return other.graph === this.graph &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to &&
      this.darkMode === other.darkMode
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('span')
    elem.classList.add('mermaid-chart')

    const id = `graphDiv${Date.now()}`
    mermaid.render(id, this.graph).then(({ svg, bindFunctions }) => {
      elem.innerHTML = svg
      bindFunctions?.(elem)
    }).catch((err: any): void => {
      elem.classList.add('error')
      // TODO: Localise!
      elem.innerText = `Could not render Graph:\n\n${err.str as string}`
    })

    elem.addEventListener('click', clickAndSelect(view))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // This parser should look for InlineCode and FencedCode and then immediately
  // check its first CodeMark child to ensure its contents only include $ or $$.
  if (node.type.name !== 'FencedCode') {
    return false
  }

  // We've got some code. Ensure we have an info string that happens to be 7
  // chars long (= `mermaid`)
  const firstChild = node.node.getChildren('CodeInfo')[0]
  if (firstChild === undefined) {
    return false
  }

  const markSpan = firstChild.to - firstChild.from

  if (markSpan !== 7) {
    return false
  }

  return true // There's reason to assume we are indeed dealing with a math equation
}

function createWidget (state: EditorState, node: SyntaxNodeRef): MermaidWidget|undefined {
  // Get the node's text contents, determine if this is a displayMode equation,
  // and then remove the leading and trailing dollars. Also, pass a stable node
  // reference (SyntaxNodeRef will be dropped, but the SyntaxNode itself will
  // stay, and keep its position updated depending on what happens in the doc)
  const nodeText = state.sliceDoc(node.from, node.to)
  if (!nodeText.startsWith('```mermaid') && !nodeText.startsWith('~~~mermaid')) {
    return undefined
  }

  const graph = nodeText.replace(/^[`~]{1,3}mermaid\n(.+?)\n[`~]{1,3}$/s, '$1') // NOTE the s flag
  // NOTE: We have to pass the current value of the darkMode config value to
  // see in what mode the mermaid graph has actually been rendered to re-render
  // the graph if necessary
  return new MermaidWidget(graph, node.node, window.config.get('darkMode') as boolean)
}

export const renderMermaid = renderBlockWidgets(shouldHandleNode, createWidget)
