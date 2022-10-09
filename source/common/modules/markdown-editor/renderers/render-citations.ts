// Utilizing a ReplaceDecorator, we're here rendering stuff.

// The renderers are adapted from the example here:
// https://codemirror.net/examples/decoration/#boolean-toggle-widgets
import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import extractCitations, { CitePosition } from '@common/util/extract-citations'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { citationMenu } from '../context-menu/citation-menu'
import { configField } from '../util/configuration'

class CitationWidget extends WidgetType {
  constructor (readonly citation: CitePosition, readonly node: SyntaxNode) {
    super()
  }

  eq (other: CitationWidget): boolean {
    return JSON.stringify(other.citation) === JSON.stringify(this.citation)
  }

  toDOM (view: EditorView): HTMLElement {
    const config = view.state.field(configField).metadata.library
    const library = config === '' ? CITEPROC_MAIN_DB : config
    const callback = window.getCitationCallback(library)
    const renderedCitation = callback(this.citation.citations, false)

    const elem = document.createElement('a')
    if (renderedCitation !== undefined) {
      elem.innerText = renderedCitation
    } else {
      elem.innerText = `(Could not render ${this.citation.citations.map(x => x.id).join(', ')})`
      elem.classList.add('error')
    }
    elem.addEventListener('click', clickAndSelect(view, this.node))

    elem.addEventListener('contextmenu', (event) => {
      const keys = this.citation.citations.map(x => x.id)
      const coords = { x: event.clientX, y: event.clientY }
      citationMenu(view, coords, keys, elem.innerText)
    })

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
  // NOTE That extractCitations also works on longer texts, hence we get an
  // array, but the widget itself only cares about one single citation.
  const citation = extractCitations(state.sliceDoc(node.from, node.to))
  if (citation.length !== 1) {
    return undefined // Should not happen, but we never know.
  }

  return new CitationWidget(citation[0], node.node)
}

export const renderCitations = renderInlineWidgets(shouldHandleNode, createWidget)
