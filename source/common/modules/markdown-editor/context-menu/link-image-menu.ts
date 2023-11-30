/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        linkImageMenu Function
 * CVM-Role:        Utility function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Contains a context menu appropriate for links and images
 *
 * END HEADER
 */

import { type EditorState } from '@codemirror/state'
import { type EditorView } from '@codemirror/view'
import { trans } from '@common/i18n-renderer'
import showPopupMenu from '@common/modules/window-register/application-menu-helper'
import { type AnyMenuItem } from '@dts/renderer/context'
import { type SyntaxNode } from '@lezer/common'
import openMarkdownLink from '../util/open-markdown-link'
import { shortenUrlVisually } from '@common/util/shorten-url-visually'

const clipboard = window.clipboard
const ipcRenderer = window.ipc

/**
 * Given a node, extracts the first child of type 'URL' and returns its text
 * contents
 *
 * @param   {SyntaxNode}   node   The node
 * @param   {EditorState}  state  The editor state (for extracting the text)
 *
 * @return  {string}              The URL string, or undefined
 */
function getURLForNode (node: SyntaxNode, state: EditorState): string|undefined {
  const child = node.getChild('URL')

  if (child === null) {
    return undefined
  } else {
    return state.sliceDoc(child.from, child.to)
  }
}

/**
 * Shows a context menu appropriate for a link or image using the given node
 *
 * @param   {EditorView}                view    The view
 * @param   {SyntaxNode}                node    The node
 * @param   {{ x: number, y: number }}  coords  The coordinates
 */
export function linkImageMenu (view: EditorView, node: SyntaxNode, coords: { x: number, y: number }): void {
  const url = getURLForNode(node, view.state)

  if (url === undefined) {
    return
  }

  const linkTpl: AnyMenuItem[] = [
    {
      id: 'none',
      label: shortenUrlVisually(url, 60),
      enabled: false,
      type: 'normal'
    },
    {
      type: 'separator'
    },
    {
      id: 'menu.open_link',
      label: trans('Open Link'),
      enabled: true,
      type: 'normal'
    },
    {
      // It's either "Copy Link" or "Copy Mail"
      id: 'menu.copy_link',
      enabled: true,
      type: 'normal',
      label: (url.indexOf('mailto:') === 0) ? trans('Copy Mail Address') : trans('Copy Link')
    }
  ]

  const isFileLink = url.startsWith('safe-file://') || url.startsWith('file://')
  const isLink = node.type.name === 'Link'

  const imgTpl: AnyMenuItem[] = [
    {
      label: trans('Copy image to clipboard'),
      id: 'copy-img-to-clipboard',
      enabled: isFileLink,
      type: 'normal'
    },
    {
      label: trans('Open in browser'),
      id: 'open-img-in-browser',
      enabled: !isFileLink,
      type: 'normal'
    },
    {
      label: trans('Show file'),
      id: 'show-img-in-folder',
      enabled: !isFileLink,
      type: 'normal'
    }
  ]

  showPopupMenu(coords, isLink ? linkTpl : imgTpl, (clickedID) => {
    if (clickedID === 'menu.copy_link') {
      clipboard.writeText(url)
    } else if (clickedID === 'menu.open_link') {
      openMarkdownLink(url, view)
    } else if (clickedID === 'show-img-in-folder') {
      ipcRenderer.send('window-controls', {
        command: 'show-item-in-folder',
        payload: url // Show the item in folder
      })
    } else if (clickedID === 'open-img-in-browser') {
      // TODO
    }
  })
}
