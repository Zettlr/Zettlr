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
import showPopupMenu, { type AnyMenuItem } from '@common/modules/window-register/application-menu-helper'
import { type SyntaxNode } from '@lezer/common'
import openMarkdownLink from '../util/open-markdown-link'
import { shortenUrlVisually } from '@common/util/shorten-url-visually'
import makeValidUri from 'source/common/util/make-valid-uri'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'
import { configField } from '../util/configuration'
import type { WindowControlsIPCAPI } from 'source/app/service-providers/windows'
import { findReferenceForLinkLabel, removeMarkdownLink } from '../util/links'

const ipcRenderer = window.ipc

/**
 * Given a node, tries to find a URL node. This function expects that node is of
 * type URL or any node that can contain an URL node as a child.
 *
 * @param   {SyntaxNode}   node   The node
 * @param   {EditorState}  state  The editor state (for extracting the text)
 *
 * @return  {string}              The URL string, or undefined
 */
function getURLForNode (node: SyntaxNode, state: EditorState): string|undefined {
  if (node.type.name === 'URL') {
    return state.sliceDoc(node.from, node.to)
  }

  const child = node.getChild('URL')

  if (child !== null) {
    return state.sliceDoc(child.from, child.to)
  }

  // No URL child, which might indicate a reference-style link. For reference
  // style links, URL nodes are in the reference, so above's construct will have
  // by now found it. If we're here, we might be dealing with a link ref, which
  // has the tree structure [text content][LinkLabel].
  const label = node.type.name === 'Link' ? node.getChild('LinkLabel') : node
  if (label === null || label.type.name !== 'LinkLabel') {
    return undefined
  }

  // We have the link label. Now we just have to scour the rest of the
  // document for the reference. We use a helper function for that.
  const labelString = state.sliceDoc(label.from, label.to) // e.g., `[link]`
  const ref = findReferenceForLinkLabel(state, labelString)

  if (ref !== null) {
    const url = ref.getChild('URL')
    if (url !== null) {
      return state.sliceDoc(url.from, url.to)
    }
  }

  return undefined
}

/**
 * Shows a context menu appropriate for a link or image using the given node
 *
 * @param   {EditorView}                view    The view
 * @param   {SyntaxNode}                node    The node
 * @param   {{ x: number, y: number }}  coords  The coordinates
 */
export function linkImageMenu (view: EditorView, node: SyntaxNode, coords: { x: number, y: number }): void {
  const basePath = pathDirname(view.state.field(configField).metadata.path)
  const url = getURLForNode(node, view.state)

  if (url === undefined) {
    console.error('Could not show Link/Image context menu: No URL found!')
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
      label: trans('Open link'),
      type: 'normal'
    },
    {
      // It's either "Copy Link" or "Copy Mail"
      id: 'menu.copy_link',
      type: 'normal',
      label: (url.indexOf('mailto:') === 0) ? trans('Copy email address') : trans('Copy link')
    },
    {
      id: 'menu.remove_link',
      type: 'normal',
      label: trans('Remove link')
    }
  ]

  const validAbsoluteURI = makeValidUri(url, basePath)
  const isFileLink = validAbsoluteURI.startsWith('safe-file://') || validAbsoluteURI.startsWith('file://')
  const isLink = node.type.name !== 'Image'

  const imgTpl: AnyMenuItem[] = [
    {
      label: trans('Copy image to clipboard'),
      id: 'copy-img-to-clipboard',
      enabled: isFileLink,
      type: 'normal'
    },
    {
      label: trans('Open image'),
      id: 'open-img-in-browser',
      type: 'normal'
    },
    {
      label: process.platform === 'darwin' ? trans('Reveal in Finder') : trans('Open in File Browser'),
      id: 'show-img-in-folder',
      enabled: isFileLink,
      type: 'normal'
    }
  ]

  showPopupMenu(coords, isLink ? linkTpl : imgTpl, (clickedID) => {
    if (clickedID === 'menu.copy_link') {
      const sanitizedUrl = url.replace(/^<|>$/g, '') // Remove markdown characters
      navigator.clipboard.writeText(sanitizedUrl).catch(err => console.error(err))
    } else if (clickedID === 'menu.open_link') {
      openMarkdownLink(url, view)
    } else if (clickedID === 'show-img-in-folder') {
      ipcRenderer.send('window-controls', {
        command: 'show-item-in-folder',
        payload: { itemPath: validAbsoluteURI }
      } as WindowControlsIPCAPI)
    } else if (clickedID === 'open-img-in-browser') {
      window.location.href = validAbsoluteURI
    } else if (clickedID === 'menu.remove_link') {
      if (node.type.name === 'URL' && node.parent?.type.name === 'Link') {
        // Handles when user clicks on (url) node in the [text](url) type link
        removeMarkdownLink(node.parent, view)
      } else {
        // Handles when user clicks on [text] part of [text](url) type link or <url> part of <url> type link
        removeMarkdownLink(node, view)
      }
    }
  })
}
