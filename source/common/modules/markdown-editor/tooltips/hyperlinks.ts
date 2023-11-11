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

const path = window.path
const ipcRenderer = window.ipc

/**
 * Displays a tooltip for URLs and Links across a document
 */
export function urlTooltip (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  let nodeAt = syntaxTree(view.state).cursorAt(pos, side).node

  // NOTE: If the user has renderLinks set to true, they depend on the widget's
  // hover state. (This listener will not trigger)
  if (nodeAt.type.name === 'Link') {
    const urlNode = nodeAt.getChild('URL')
    if (urlNode === null) {
      return null
    }
    nodeAt = urlNode
  } else if (nodeAt.type.name !== 'URL') {
    return null
  }

  // We got an URL.
  const url = view.state.sliceDoc(nodeAt.from, nodeAt.to)
  const base = path.dirname(view.state.field(configField).metadata.path)
  const validURI = makeValidUri(url, base)

  return {
    pos,
    above: true,
    create (view) {
      const dom = document.createElement('div')
      dom.textContent = validURI
      ipcRenderer.invoke('application', { command: 'fetch-link-preview', payload: validURI })
        .then(res => {
          if (res === undefined) {
            return // No link preview available
          }

          dom.innerHTML = ''

          const h4 = document.createElement('h4')
          h4.textContent = res.title

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
            para.textContent = res.summary
            imgParaWrapper.appendChild(para)
          }

          const link = document.createElement('span')
          // We can remove the "safe file" as this is a protocol only intended for
          // local files
          link.textContent = shortenUrlVisually(validURI.replace(/^safe-file:\/\//, ''))
          link.style.fontSize = '80%'
          link.style.fontFamily = 'monospace'
          link.style.wordBreak = 'break-word'

          dom.appendChild(h4)
          dom.appendChild(imgParaWrapper)
          dom.appendChild(link)
        })
        .catch(err => { console.error(`Could not generate link preview for URL ${validURI}`, err) })
      return { dom }
    }
  }
}

export const urlHover = hoverTooltip(urlTooltip, { hoverTime: 100 })
