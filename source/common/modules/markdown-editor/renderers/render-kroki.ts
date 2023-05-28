/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        KrokiRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer displays kroki graphs.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNode, type SyntaxNodeRef } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'

import { deflate } from 'pako'
import { type EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'

const DIAGRAM_TYPES = [
  'blockdiag', 'bpmn', 'bytefield', 'seqdiag', 'actdiag',
  'nwdiag', 'packetdiag', 'rackdiag', 'c4plantuml', 'ditaa',
  'erd', 'excalidraw', 'graphviz', 'mermaid', 'nomnoml',
  'plantuml', 'svgbob', 'umlet', 'vega', 'vegalite', 'wavedrom'
]
const DIAGRAM_SYNONYMNS = { 'dot': 'graphviz', 'c4': 'c4plantuml' }

class KrokiWidget extends WidgetType {
  constructor (readonly type: string, readonly graph: string, readonly node: SyntaxNode, readonly darkMode: boolean, readonly caption: string|undefined, readonly width: string|undefined) {
    super()
  }

  eq (other: KrokiWidget): boolean {
    return other.graph === this.graph &&
      other.type === this.type &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to &&
      other.darkMode === this.darkMode &&
      other.caption === this.caption &&
      other.width === this.width
  }

  toDOM (view: EditorView): HTMLElement {
    let graph = this.graph
    if (this.darkMode && [ 'plantuml', 'c4plantuml' ].includes(this.type)) {
      graph = 'skinparam monochrome reverse\n' + graph
    }

    const data = new TextEncoder().encode(graph)
    const compressed = deflate(data, { level: 9 })
    // @ts-expect-error As Uint8Array is compatible with number[] in this case
    const result = window.btoa(String.fromCharCode.apply(null, compressed))
      .replace(/\+/g, '-').replace(/\//g, '_')

    const figure = document.createElement('figure')
    figure.addEventListener('click', clickAndSelect(view))

    const svg = document.createElement('object')
    svg.setAttribute('type', 'image/svg+xml')
    svg.setAttribute('data', `https://kroki.io/${this.type}/svg/${result}`)
    if (this.width) {
      svg.setAttribute('width', this.width)
    }
    figure.appendChild(svg)

    // caption
    if (this.caption) {
      const caption = document.createElement('figcaption')
      caption.textContent = this.caption
      caption.contentEditable = 'false'
      figure.appendChild(caption)
    }

    return figure
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

  if (markSpan < 2) {
    return false
  }

  return true // There's reason to assume we are indeed dealing with a math equation
}

function createWidget (state: EditorState, node: SyntaxNodeRef): KrokiWidget|undefined {
  // Get the node's text contents, determine if this is a displayMode equation,
  // and then remove the leading and trailing dollars. Also, pass a stable node
  // reference (SyntaxNodeRef will be dropped, but the SyntaxNode itself will
  // stay, and keep its position updated depending on what happens in the doc)
  const nodeText = state.sliceDoc(node.from, node.to)
  let detectedDiagramType: string|undefined
  for (const type of [ ...DIAGRAM_TYPES, ...Object.keys(DIAGRAM_SYNONYMNS) ]) {
    if (nodeText.startsWith('```' + type) || nodeText.startsWith('~~~' + type) || nodeText.startsWith('```{.' + type)) {
      detectedDiagramType = type
      break
    }
  }
  if (typeof detectedDiagramType === 'undefined') {
    return undefined
  }

  if (Object.prototype.hasOwnProperty.call(DIAGRAM_SYNONYMNS, detectedDiagramType)) {
    detectedDiagramType = DIAGRAM_SYNONYMNS[detectedDiagramType as keyof typeof DIAGRAM_SYNONYMNS]
  }

  const graph = nodeText.replace(/^[`~]{1,3}[^\n]*\n(.+?)\n[`~]{1,3}$/s, '$1') // NOTE the s flag
  const firstLine = nodeText.match(/^[`~]{1,3}\{.[a-zA-Z]*\s([^}]+)/)?.[1]

  let caption: string|undefined
  let width: string|undefined
  if (firstLine) {
    caption = firstLine.match(/caption="([^"]+)"/)?.[1]
    width = firstLine.match(/width="?([^"]+)"?/)?.[1]
  }
  // NOTE: We have to pass the current value of the darkMode config value to
  // see in what mode the kroki graph has actually been rendered to re-render
  // the graph if necessary
  return new KrokiWidget(detectedDiagramType, graph, node.node, window.config.get('darkMode') as boolean, caption, width)
}

export const renderKroki = renderBlockWidgets(shouldHandleNode, createWidget)
