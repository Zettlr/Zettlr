/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        CitationRenderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This renderer can display and pre-render citations.
 *
 * END HEADER
 */

import { renderInlineWidgets } from './base-renderer'
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { WidgetType, type EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import { CITEPROC_MAIN_DB } from '@dts/common/citeproc'
import { citationMenu } from '../context-menu/citation-menu'
import { configField } from '../util/configuration'
import { type Citation, nodeToCiteItem } from '../parser/citation-parser'

class CitationWidget extends WidgetType {
  constructor (readonly citation: Citation, readonly rawCitation: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: CitationWidget): boolean {
    return JSON.stringify(other.citation) === JSON.stringify(this.citation)
  }

  toDOM (view: EditorView): HTMLElement {
    const config = view.state.field(configField).metadata.library
    const library = config === '' ? CITEPROC_MAIN_DB : config
    const callback = window.getCitationCallback(library)
    const renderedCitation = callback(this.citation.items, this.citation.composite)

    const elem = document.createElement('span')
    elem.classList.add('citeproc-citation')
    if (renderedCitation !== undefined) {
      elem.innerHTML = renderedCitation
    } else {
      elem.innerText = this.rawCitation
      elem.classList.add('error')
    }
    elem.addEventListener('click', clickAndSelect(view))

    elem.addEventListener('contextmenu', (event) => {
      const keys = this.citation.items.map(x => x.id)
      const coords = { x: event.clientX, y: event.clientY }
      citationMenu(view, coords, keys, elem.innerText)
    })

    return elem
  }

  ignoreEvent (event: Event): boolean {
    return event instanceof MouseEvent
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // console.log(node.type.name, 'Parent: ', node.node.parent?.type.name)
  return node.type.name === 'Citation'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): CitationWidget|undefined {
  try {
    const citation = nodeToCiteItem(node.node, state.sliceDoc())
    return new CitationWidget(citation, state.sliceDoc(node.from, node.to), node.node)
  } catch (err) {
    // nodeToCiteItem throws if it is unhappy
    return undefined
  }
}

export const renderCitations = renderInlineWidgets(shouldHandleNode, createWidget)
