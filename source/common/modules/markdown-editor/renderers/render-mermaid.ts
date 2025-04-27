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
import { trans } from '@common/i18n-renderer'

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
    elem.dataset.graph = this.graph
    elem.dataset.darkTheme = String(this.darkMode)

    const id = `graphDiv${Date.now()}`
    elem.innerText = trans('Rendering mermaid graph …')
    mermaid.render(id, this.graph)
      .then(result => { elem.innerHTML = result.svg })
      .catch(err => {
        elem.classList.add('error')
        const msg = trans('Could not render Graph:')
        elem.innerText = `${msg}\n\n${err.str as string}`
      })

    elem.addEventListener('click', clickAndSelect(view))
    return elem
  }

  updateDOM (dom: HTMLElement, _view: EditorView): boolean {
    if (dom.dataset.graph === this.graph && dom.dataset.darkTheme === String(this.darkMode)) {
      return true // No update necessary
    }

    const id = `graphDiv${Date.now()}`
    dom.innerText = trans('Rendering mermaid graph …')
    mermaid.render(id, this.graph)
      .then(result => { dom.innerHTML = result.svg })
      .catch(err => {
        dom.classList.add('error')
        const msg = trans('Could not render Graph:')
        dom.innerText = `${msg}\n\n${err.str as string}`
      })

    return true
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // This parser should look for FencedCode with a CodeInfo string of at least 7
  if (node.type.name !== 'FencedCode') {
    return false
  }

  // We've got some code. Ensure we have an info string
  const codeInfo = node.node.getChild('CodeInfo')
  if (codeInfo === null) {
    return false
  }

  // The span needs to be at least 7 characters (= `mermaid`) long, but may be
  // longer (to account for, e.g., Pandoc fenced attributes)
  if (codeInfo.to - codeInfo.from < 7) {
    return false
  }

  return true
}

function createWidget (state: EditorState, node: SyntaxNodeRef): MermaidWidget|undefined {
  // This function is called after the `shouldHandleNode` function, so we can
  // disregard its checks here.
  const codeInfo = node.node.getChild('CodeInfo')!
  const infoString = state.sliceDoc(codeInfo.from, codeInfo.to)

  // The infostring can either be plain "mermaid" or a Pandoc attribute string
  // that includes the class `.mermaid` (see the Pandoc manual:
  // https://pandoc.org/MANUAL.html#extension-fenced_code_attributes)
  if (infoString !== 'mermaid' && !/^{.*\.mermaid.*}$/i.test(infoString)) {
    return undefined
  }

  const codeText = node.node.getChild('CodeText')

  if (codeText === null) {
    return undefined
  }

  const graph = state.sliceDoc(codeText.from, codeText.to)

  // NOTE: We have to pass the current value of the darkMode config value to
  // see in what mode the mermaid graph has actually been rendered to re-render
  // the graph if necessary
  return new MermaidWidget(graph, node.node, window.config.get('darkMode') as boolean)
}

export const renderMermaid = renderBlockWidgets(shouldHandleNode, createWidget)
