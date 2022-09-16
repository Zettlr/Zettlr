// Utilizing a ReplaceDecorator, we're here rendering stuff.

// The renderers are adapted from the example here:
// https://codemirror.net/examples/decoration/#boolean-toggle-widgets
import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'

class LinkWidget extends WidgetType {
  constructor (readonly linkTitle: string, readonly linkUrl: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: LinkWidget): boolean {
    return other.linkTitle === this.linkTitle && other.linkUrl === this.linkUrl
  }

  toDOM (view: EditorView): HTMLElement {
    const elem = document.createElement('a')
    elem.innerText = this.linkTitle
    elem.setAttribute('title', this.linkUrl)
    elem.setAttribute('href', this.linkUrl)

    elem.classList.add('markdown-link')

    // New service function: Enable users to style links depending on where
    // their targets are located (same file, online, or file on computer)
    if (this.linkUrl.startsWith('#')) {
      elem.classList.add('internal')
    } else if (/^[a-z]+:\/\//.test(this.linkUrl)) {
      elem.classList.add('web')
    } else {
      elem.classList.add('local')
    }

    elem.addEventListener('click', clickAndSelect(view, this.node))
    return elem
  }

  ignoreEvent (event: Event): boolean {
    return false // By default ignore all events
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'Link'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): LinkWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const literalLink = state.sliceDoc(node.from, node.to)
  const match = /(?!!)\[(?<title>.+)\]\((?<url>.+)\)/.exec(literalLink)
  if (match === null) {
    return undefined // Should not happen, but we never know.
  }

  const { title, url } = match.groups as any

  return new LinkWidget(title, url, node.node)
}

export const renderLinks = renderInlineWidgets(shouldHandleNode, createWidget)
