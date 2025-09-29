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

const ipcRenderer = window.ipc

function unescape (text: string): string {
  const value = _.unescape(text)
  return value.replace(/&#(\d+);/g, (m, p1: string) => String.fromCharCode(parseInt(p1, 10)))
}

/**
 * Displays a tooltip for URLs and Links across a document
 */
export function urlTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  let nodeAt = syntaxTree(view.state).cursorAt(pos, side).node

  // If the node here is a URL, it's quick, but if not, it must be a Link node
  // that contains a URL as a child
  if (nodeAt.type.name !== 'URL') {
    // First, navigate to one of the two possible parent nodes.
    while (nodeAt.parent !== null && ![ 'Link', 'LinkReference' ].includes(nodeAt.type.name)) {
      nodeAt = nodeAt.parent
    }

    // Then, we can either have a "Link", which can either have an URL or a
    // LinkLabel. If it has a LinkLabel, we must search the document for the
    // corresponding counterpart.

    if (nodeAt.type.name === 'Link') {
      const urlNode = nodeAt.getChild('URL')
      const labelNode = nodeAt.getChild('LinkLabel')
      if (urlNode !== null) {
        nodeAt = urlNode
      } else if (labelNode !== null) {
        const labelString = view.state.sliceDoc(labelNode.from, labelNode.to)
        const ref = findReferenceForLinkLabel(view.state, labelString)
      
        if (ref !== null) {
          const url = ref.getChild('URL')
          if (url !== null) {
            nodeAt = url
          }
        }
      }
    } else if (nodeAt.type.name === 'LinkReference') {
      const url = nodeAt.getChild('URL')
      if (url !== null) {
        nodeAt = url
      }
    }
  }

  if (nodeAt.type.name !== 'URL') {
    return null
  }

  // We got an URL.
  const absPath = view.state.field(configField).metadata.path
  const url = view.state.sliceDoc(nodeAt.from, nodeAt.to)
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
