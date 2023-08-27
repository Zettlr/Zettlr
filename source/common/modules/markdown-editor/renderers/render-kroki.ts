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
  'vegalite', 'blockdiag', 'bpmn', 'bytefield', 'seqdiag',
  'actdiag', 'nwdiag', 'packetdiag', 'rackdiag', 'c4plantuml',
  'd2', 'dbml', 'ditaa', 'erd', 'excalidraw', 'graphviz',
  'mermaid', 'nomnoml', 'pikchr', 'plantuml', 'structurizr',
  'svgbob', 'tikz', 'vega', 'wavedrom', 'wireviz'

] // vegalite must be before vega, because otherwise vegalite diagrams will be rendered as vega diagrams
const DIAGRAM_SYNONYMS = { 'dot': 'graphviz', 'c4': 'c4plantuml' }

class KrokiWidget extends WidgetType {
  constructor (readonly type: string, readonly graph: string, readonly node: SyntaxNode, readonly darkMode: boolean) {
    super()
  }

  eq (other: KrokiWidget): boolean {
    return other.graph === this.graph &&
      other.type === this.type &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to &&
      other.darkMode === this.darkMode
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

    const svg = document.createElement('img')
    svg.setAttribute('src', `https://kroki.io/${this.type}/svg/${result}`)
    svg.addEventListener('click', clickAndSelect(view))

    return svg
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  if (node.type.name !== 'FencedCode') {
    return false
  }

  // We've got some code but we cannot do anything with it if it does not have a CodeInfo
  const firstChild = node.node.getChildren('CodeInfo')[0]
  if (firstChild === undefined) {
    return false
  }

  // The shortest Code Info has 2 signs (d2)
  const markSpan = firstChild.to - firstChild.from
  if (markSpan < 2) {
    return false
  }

  return true
}

function createWidget (state: EditorState, node: SyntaxNodeRef): KrokiWidget|undefined {
  // We need to test whether the CodeInfo is one of the supported diagram types
  const nodeText = state.sliceDoc(node.from, node.to)
  const allDiagramIdentifiers = [ ...DIAGRAM_TYPES, ...Object.keys(DIAGRAM_SYNONYMS) ]
  let detectedDiagramType: string|undefined
  for (const type of allDiagramIdentifiers) {
    if (nodeText.startsWith('```' + type) || nodeText.startsWith('~~~' + type)) {
      detectedDiagramType = type
      break
    }
  }

  // If it is no supported diagram type, we can stop here
  if (typeof detectedDiagramType === 'undefined') {
    return undefined
  }

  // If it is a alias, we can replace the alias with the actual type
  if (Object.prototype.hasOwnProperty.call(DIAGRAM_SYNONYMS, detectedDiagramType)) {
    detectedDiagramType = DIAGRAM_SYNONYMS[detectedDiagramType as keyof typeof DIAGRAM_SYNONYMS]
  }

  const graph = nodeText.replace(/^[`~]{1,3}[^\n]*\n(.+?)\n[`~]{1,3}$/s, '$1') // NOTE the s flag
  return new KrokiWidget(detectedDiagramType, graph, node.node, window.config.get('darkMode') as boolean)
}

export const renderKroki = renderBlockWidgets(shouldHandleNode, createWidget)
