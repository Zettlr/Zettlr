/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Emphasis renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     An emphasis renderer
 *
 * END HEADER
 */

import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'

// A list of emphasis nodes
// const EMPHASIS_NODES = [
//   // Base Markdown
//   'Escape', // Escape character
//   'Entity', // HTML color codes (?)
//   'HardBreak', // Enforced line breaks (\\)
//   'Emphasis', // Italic
//   'StrongEmphasis', // Strong
//   'Link',
//   'Image',
//   'InlineCode',
//   'HTMLTag',
//   'Comment',
//   'URL',
//   // GFM
//   'Strikethrough'
// ]

class EmphasisWidget extends WidgetType {
  constructor (readonly nodeContents: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: EmphasisWidget): boolean {
    return other.nodeContents === this.nodeContents &&
      other.node.from === this.node.from &&
      other.node.to === this.node.to
  }

  toDOM (view: EditorView): HTMLElement {
    let elem = document.createElement('span')
    let contents = this.nodeContents
    switch (this.node.type.name) {
      case 'Emphasis':
        elem = document.createElement('em')
        contents = contents.replace(/[*_]{1}(.+?)[*_]{1}/, '$1')
        break
      case 'StrongEmphasis':
        elem = document.createElement('strong')
        contents = contents.replace(/[*_]{2}(.+?)[*_]{2}/, '$1')
        break
    }

    elem.textContent = contents
    elem.addEventListener('mousedown', clickAndSelect(view, this.node))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return event instanceof MouseEvent
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return [ 'Emphasis', 'StrongEmphasis', 'Strikethrough' ].includes(node.type.name)
}

function createWidget (state: EditorState, node: SyntaxNodeRef): EmphasisWidget|undefined {
  return new EmphasisWidget(state.sliceDoc(node.from, node.to), node.node)
}

export const renderEmphasis = renderInlineWidgets(shouldHandleNode, createWidget)
