/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Hyperlinks Tooltips
 * CVM-Role:        Extension
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This file displays tooltips for URLs and Links.
 *
 * END HEADER
 */

import { hoverTooltip, type EditorView, type Tooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { configField } from '../util/configuration'
import makeValidUri from '@common/util/make-valid-uri'
import { shortenUrlVisually } from '@common/util/shorten-url-visually'
import { trans } from '@common/i18n-renderer'
import { pathDirname } from '@common/util/renderer-path-polyfill'
import _ from 'underscore'
import { findReferenceForLinkLabel } from '../util/links'
import { posInNode } from '../util/node-in-selection'

const ipcRenderer = window.ipc

function unescape (text: string): string {
  const value = _.unescape(text)
  return value.replace(/&#(\d+);/g, (m, p1: string) => String.fromCharCode(parseInt(p1, 10)))
}

/**
 * Displays a tooltip for URLs and Links across a document
 */
export function urlTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  const tree = syntaxTree(view.state)
  let node = posInNode(pos, tree, [ 'URL', 'Link', 'LinkReference' ], side)

  if (node === null) {
    return null
  }

  // We either have a "Link", which can either have an URL, a  "LinkReference",
  // or a "URL". If it has a "LinkReference", we must search the document for the
  // corresponding counterpart.
  if (node.name === 'Link') {
    const urlNode = node.getChild('URL')
    const labelNode = node.getChild('LinkLabel')
    if (urlNode !== null) {
      node = urlNode
    } else if (labelNode !== null) {
      const labelString = view.state.sliceDoc(labelNode.from, labelNode.to)
      const ref = findReferenceForLinkLabel(view.state, labelString)

      if (ref !== null) {
        const url = ref.getChild('URL')
        if (url !== null) {
          node = url
        }
      }
    }
  } else if (node.name === 'LinkReference') {
    const url = node.getChild('URL')
    if (url !== null) {
      node = url
    }
  }

  // We got an URL.
  const absPath = view.state.field(configField).metadata.path
  const url = view.state.sliceDoc(node.from, node.to)
  const base = pathDirname(absPath)
  const validURI = makeValidUri(url, base)

  return {
    pos,
    above: true,
    create (_view) {
      const dom = document.createElement('div')
      let shortUrl = shortenUrlVisually(validURI.replace('safe-file://', ''))
      // Due to the colons in the drive letters on Windows, the pathname will
      // look like this: /C:/Users/Documents/test.jpg
      // See: https://github.com/Zettlr/Zettlr/issues/5489
      if (/^\/[A-Z]:/i.test(shortUrl)) {
        shortUrl = shortUrl.slice(1)
      }

      dom.textContent = trans('Fetching link preview…')
      ipcRenderer.invoke('application', { command: 'fetch-link-preview', payload: validURI })
        .then(res => {
          if (res === undefined) {
            dom.textContent = shortUrl
            return // No link preview available
          }

          dom.innerHTML = ''

          const h4 = document.createElement('h4')
          h4.textContent = unescape(res.title as string)

          const imgParaWrapper = document.createElement('div')
          imgParaWrapper.style.margin = '10px 0'

          if (res.image !== undefined) {
            const img = document.createElement('img')
            img.src = res.image
            img.style.maxWidth = '100px'
            img.style.maxHeight = '100px'
            img.style.marginRight = '10px'
            img.style.marginBottom = '10px'
            img.style.float = 'left'
            imgParaWrapper.appendChild(img)
          }

          if (res.summary !== undefined) {
            const para = document.createElement('p')
            para.style.margin = '0'
            para.style.whiteSpace = 'pre-wrap'
            para.textContent = unescape(res.summary as string)
            imgParaWrapper.appendChild(para)
          }

          const link = document.createElement('span')
          // We can remove the "safe file" as this is a protocol only intended for
          // local files
          link.textContent = shortUrl
          link.style.fontSize = '80%'
          link.style.fontFamily = 'monospace'
          link.style.wordBreak = 'break-word'

          dom.appendChild(h4)
          dom.appendChild(imgParaWrapper)
          dom.appendChild(link)
        })
        .catch(err => {
          console.error(`Could not generate link preview for URL ${validURI}`, err)
        })
      return { dom }
    }
  }
}

export const urlHover = hoverTooltip(urlTooltip, { hoverTime: 1000 })
