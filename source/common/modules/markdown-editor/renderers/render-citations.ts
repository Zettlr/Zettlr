// Utilizing a ReplaceDecorator, we're here rendering stuff.

// The renderers are adapted from the example here:
// https://codemirror.net/examples/decoration/#boolean-toggle-widgets
import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import extractCitations, { CitePosition } from '@common/util/extract-citations'

class CitationWidget extends WidgetType {
  constructor (readonly citations: CitePosition[], readonly node: SyntaxNode) {
    super()
  }

  eq (other: CitationWidget): boolean {
    return JSON.stringify(other.citations) === JSON.stringify(this.citations)
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('a')
    elem.innerText = '(Imagine a citation here)' // TODO
    elem.addEventListener('click', clickAndSelect(view, this.node))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // console.log(node.type.name, 'Parent: ', node.node.parent?.type.name)
  return node.type.name === 'Citation'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): CitationWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const citation = extractCitations(state.sliceDoc(node.from, node.to))
  if (citation.length === 0) {
    return undefined // Should not happen, but we never know.
  }

  return new CitationWidget(citation, node.node)
}

export const renderCitations = renderInlineWidgets(shouldHandleNode, createWidget)
