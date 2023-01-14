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

import { renderInlineWidgets } from './base-renderer'
import { SyntaxNodeRef, SyntaxNode } from '@lezer/common'
import { EditorView, WidgetType } from '@codemirror/view'
import { EditorState } from '@codemirror/state'
import clickAndSelect from './click-and-select'
import openMarkdownLink from '../util/open-markdown-link'
import { linkImageMenu } from '../context-menu/link-image-menu'
import { configField } from '../util/configuration'
import makeValidUri from '@common/util/make-valid-uri'
import tippy from 'tippy.js'

const path = window.path
const ipcRenderer = window.ipc

class LinkWidget extends WidgetType {
  constructor (readonly linkTitle: string, readonly linkUrl: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: LinkWidget): boolean {
    return other.linkTitle === this.linkTitle && other.linkUrl === this.linkUrl
  }

  toDOM (view: EditorView): HTMLElement {
    const base = path.dirname(view.state.field(configField).metadata.path)
    const validURI = makeValidUri(this.linkUrl, base)

    const elem = document.createElement('a')
    elem.innerText = this.linkTitle
    // elem.setAttribute('title', validURI)
    elem.setAttribute('href', validURI)

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

    elem.addEventListener('click', (event) => {
      event.preventDefault()
      event.stopPropagation()
      const cmd = event.metaKey && process.platform === 'darwin'
      const ctrl = event.ctrlKey && process.platform !== 'darwin'
      if (cmd || ctrl) {
        openMarkdownLink(this.linkUrl, view)
      } else {
        clickAndSelect(view, this.node)(event)
      }
    })

    elem.addEventListener('contextmenu', (event) => {
      event.preventDefault()
      event.stopPropagation()
      linkImageMenu(view, this.node, { x: event.clientX, y: event.clientY })
    })

    const tooltip = tippy(elem, {
      content: validURI,
      arrow: false,
      delay: 100,
      placement: 'auto-start',
      allowHTML: true
    })

    ipcRenderer.invoke('application', { command: 'fetch-link-preview', payload: validURI })
      .then(res => {
        if (res === undefined) {
          return // No link preview available
        }

        const dom = document.createElement('div')

        const h4 = document.createElement('h4')
        h4.textContent = res.title
        dom.appendChild(h4)

        if (res.image !== undefined) {
          const img = document.createElement('img')
          img.src = res.image
          img.style.maxWidth = '100px'
          img.style.maxHeight = '100px'
          img.style.float = 'left'
          img.style.marginRight = '10px'
          img.style.marginBottom = '10px'
          dom.appendChild(img)
        }

        if (res.summary !== undefined) {
          const para = document.createElement('p')
          para.style.whiteSpace = 'pre-wrap'
          para.textContent = res.summary
          dom.appendChild(para)
        }

        const link = document.createElement('span')
        // We can remove the "safe file" as this is a protocol only intended for
        // local files
        link.textContent = validURI.replace(/^safe-file:\/\//, '')
        link.style.fontSize = '80%'
        link.style.fontFamily = 'monospace'
        dom.appendChild(link)

        tooltip.setContent(dom)
      })
      .catch(err => { console.error(`Could not generate link preview for URL ${validURI}`, err) })

    return elem
  }

  ignoreEvent (event: Event): boolean {
    if (event instanceof MouseEvent) {
      return true
    }

    return false
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  // We render either full Links (-> [Title](URL)), or plain links (identified
  // as URL nodes which are not children of Link nodes)
  return node.type.name === 'Link' ||
    (node.type.name === 'URL' && node.node.parent?.type.name !== 'Link')
}

function createWidget (state: EditorState, node: SyntaxNodeRef): LinkWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  if (node.type.name === 'URL') {
    const url = state.sliceDoc(node.from, node.to)
    return new LinkWidget(url, url, node.node)
  }

  const literalLink = state.sliceDoc(node.from, node.to)
  const match = /(?!!)\[(?<title>.+)\]\((?<url>.+)\)/.exec(literalLink)
  if (match === null) {
    return undefined // Should not happen, but we never know.
  }

  const { title, url } = match.groups as any

  return new LinkWidget(title, url, node.node)
}

export const renderLinks = renderInlineWidgets(shouldHandleNode, createWidget)
