/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        iFrame renderer
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This extension renders iframe elements, respecting Zettlr's
 *                  internal whitelist of allowed hostnames.
 *
 * END HEADER
 */

import { renderBlockWidgets } from './base-renderer'
import { type SyntaxNodeRef, type SyntaxNode } from '@lezer/common'
import { WidgetType, EditorView } from '@codemirror/view'
import { type EditorState } from '@codemirror/state'

/**
 * Returns an iframe element with the given source as its src attribute.
 *
 * @param   {string}             source  The URL to whatever needs to be displayed.
 *
 * @return  {HTMLIFrameElement}          The iframe element
 */
function getIframe (source: string): HTMLIFrameElement {
  const elem = document.createElement('iframe')
  elem.src = source
  return elem
}

/**
 * Returns the generic iframe wrapper for both iframes and the warning.
 *
 * @return  {HTMLDivElement}  The wrapper element
 */
function getIframeWrapper (): HTMLDivElement {
  const wrapper = document.createElement('div')
  wrapper.classList.add('iframe-wrapper')
  return wrapper
}

/**
 * Creates a warning for the given source and hostname, so that the user needs
 * to take action if they want to see the iframe rendered.
 *
 * @param   {string}          source    The full URL to the source
 * @param   {string}          hostname  The hostname part of the URL
 *
 * @return  {HTMLDivElement}            The placeholder element
 */
function getPlaceholder (source: string, hostname: string): HTMLDivElement {
  const wrapper = getIframeWrapper()
  const info = document.createElement('p')
  info.innerHTML = `iFrame elements can contain harmful content. The hostname <strong>${hostname}</strong> is not yet marked as safe. Do you wish to render this iFrame?`
  const renderAlways = document.createElement('button')
  renderAlways.textContent = `Always allow content from ${hostname}`
  const renderOnce = document.createElement('button')
  renderOnce.textContent = 'Render this time only'

  wrapper.appendChild(info)
  wrapper.appendChild(renderAlways)
  wrapper.appendChild(renderOnce)

  renderOnce.onclick = (event) => {
    // Render the iFrame, but only this time
    const iframe = getIframe(source)
    wrapper.innerHTML = iframe.outerHTML
  }

  renderAlways.onclick = (event) => {
    // Render the iFrame and also add the hostname to the whitelist
    const iframe = getIframe(source)
    wrapper.innerHTML = iframe.outerHTML

    const currentWhitelist: string[] = window.config.get('system.iframeWhitelist')
    currentWhitelist.push(hostname)
    window.config.set('system.iframeWhitelist', currentWhitelist)
  }

  return wrapper
}

class IFrameWidget extends WidgetType {
  constructor (readonly source: string, readonly node: SyntaxNode) {
    super()
  }

  eq (other: IFrameWidget): boolean {
    return other.source === this.source
  }

  toDOM (_view: EditorView): HTMLElement {
    const { hostname } = new URL(this.source)

    // Check if the hostname is part of our whitelist. If so, render it directly
    // Otherwise, render a placeholder instead.
    const whitelist: string[] = window.config.get('system.iframeWhitelist')

    if (whitelist.includes(hostname)) {
      const wrapper = getIframeWrapper()
      wrapper.innerHTML = getIframe(this.source).outerHTML
      return wrapper
    } else {
      return getPlaceholder(this.source, hostname)
    }
  }

  ignoreEvent (event: Event): boolean {
    if (event instanceof MouseEvent) {
      return true
    }

    return false
  }
}

function shouldHandleNode (node: SyntaxNodeRef): boolean {
  return node.type.name === 'HTMLBlock'
}

function createWidget (state: EditorState, node: SyntaxNodeRef): IFrameWidget|undefined {
  // Get the actual link contents, extract title and URL and create a
  // replacement widget
  const block = state.sliceDoc(node.from, node.to)
  const match = /^<iframe .*?src="(.+?)".*?>.*?<\/iframe>$/i.exec(block)
  if (match === null) {
    return undefined // e.g., if it was no iframe, or there was no source
  }

  const source = match[1]

  return new IFrameWidget(source, node.node)
}

export const renderIframes = [
  renderBlockWidgets(shouldHandleNode, createWidget),
  EditorView.baseTheme({
    '.iframe-wrapper': {
      backgroundColor: 'rgb(240, 240, 240)',
      borderRadius: '4px',
      padding: '20px'
    },
    '&dark .iframe-wrapper': {
      backgroundColor: 'rgb(80, 80, 90)'
    }
  })
]
