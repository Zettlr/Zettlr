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

import { EditorView, hoverTooltip, Tooltip } from '@codemirror/view'
import { syntaxTree } from '@codemirror/language'
import { configField } from '../util/configuration'
import makeValidUri from '@common/util/make-valid-uri'

const path = window.path

/**
 * Displays a tooltip for URLs and Links across a document
 */
function urlTooltips (view: EditorView, pos: number, side: 1 | -1): Tooltip|null {
  // let { from, text } = view.state.doc.lineAt(pos)
  // const relativePos = pos - from

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
      let dom = document.createElement('div')
      dom.textContent = validURI
      return { dom }
    }
  }
}

export const urlHover = hoverTooltip(urlTooltips, { hoverTime: 100 })
