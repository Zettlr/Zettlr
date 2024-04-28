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
import makeValidUri from 'source/common/util/make-valid-uri'
import { pathDirname } from 'source/common/util/renderer-path-polyfill'
import { configField } from '../util/configuration'

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

  if (child === null) {
    return undefined
  } else {
    return state.sliceDoc(child.from, child.to)
  }
}

// function getTextForNode (node: SyntaxNode, state: EditorState): string|undefined {
//   if (node.type.name === 'Text') {
//     return state.sliceDoc(node.from, node.to)
//   }

//   const child = node.getChild('Text')

//   if (child === null) {
//     return undefined
//   } else {
//     return state.sliceDoc(child.from, child.to)
//   }
// }

// Parses the regex string, I think this might be something that should be moved potentially into the
// markdown-editor/util directory potentially
// function removeMarkdownLink (markdownText: string): string {
//   const markdownLinkRegex = /\[([^\]]+)\]\([^)]+\)/g

//   // URL Regex from ../../commands/markdown.ts
//   const urlRE = /^\[([^\]]+)\]\((.+?)\)|(((?:(?:aaas?|about|acap|adiumxtra|af[ps]|aim|apt|attachment|aw|beshare|bitcoin|bolo|callto|cap|chrome(?:-extension)?|cid|coap|com-eventbrite-attendee|content|crid|cvs|data|dav|dict|dlna-(?:playcontainer|playsingle)|dns|doi|dtn|dvb|ed2k|facetime|feed|file|finger|fish|ftp|geo|gg|git|gizmoproject|go|gopher|gtalk|h323|hcp|https?|iax|icap|icon|im|imap|info|ipn|ipp|irc[6s]?|iris(?:\.beep|\.lwz|\.xpc|\.xpcs)?|itms|jar|javascript|jms|keyparc|lastfm|ldaps?|magnet|mailto|maps|market|message|mid|mms|ms-help|msnim|msrps?|mtqp|mumble|mupdate|mvn|news|nfs|nih?|nntp|notes|oid|opaquelocktoken|palm|paparazzi|platform|pop|pres|proxy|psyc|query|res(?:ource)?|rmi|rsync|rtmp|rtsp|secondlife|service|session|sftp|sgn|shttp|sieve|sips?|skype|sm[bs]|snmp|soap\.beeps?|soldat|spotify|ssh|steam|svn|tag|teamspeak|tel(?:net)?|tftp|things|thismessage|tip|tn3270|tv|udp|unreal|urn|ut2004|vemmi|ventrilo|view-source|webcal|wss?|wtai|wyciwyg|xcon(?:-userid)?|xfire|xmlrpc\.beeps?|xmpp|xri|ymsgr|z39\.50[rs]?):(?:\/{1,3}|[a-z0-9%])|www\d{0,3}[.]|[a-z0-9.-]+[.][a-z]{2,4}\/)(?:[^\s()<>]|\([^\s()<>]*\))+(?:\([^\s()<>]*\)|[^\s`*!()[\]{};:'".,<>?«»“”‘’])))|([a-z0-9.\-_+]+?@[a-z0-9.\-_+]+\.[a-z]{2,7})$/i

//   return markdownText.replace(markdownLinkRegex, '$1')
// }

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
  // Calls the remove markdown thing, although I note this is called on every right link context menu so this might
  // not be needed until its clicked, also the node.from is the starting index in the document and node.to is the end
  // index so when you do the slice doc it gets the full string
  // const textToInsert = removeMarkdownLink(view.state.sliceDoc(node.from, node.to))
  // const textToInsert = getTextForNode(node, view.state)

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
    },
    {
      id: 'menu.remove_link',
      enabled: true,
      type: 'normal',
      label: trans('Remove Link')
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
      enabled: true,
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
      navigator.clipboard.writeText(url).catch(err => console.error(err))
    } else if (clickedID === 'menu.open_link') {
      openMarkdownLink(url, view)
    } else if (clickedID === 'show-img-in-folder') {
      ipcRenderer.send('window-controls', {
        command: 'show-item-in-folder',
        payload: validAbsoluteURI
      })
    } else if (clickedID === 'open-img-in-browser') {
      window.location.href = validAbsoluteURI
    } else if (clickedID === 'menu.remove_link') {
      // Idk if they want us to directly change this stuff here so I think it might be a move basically everything
      // I did into the utils directory, we could also go one step further and merge the open markdown links into
      // the utils file as well so all the link utils are together
      const nodeText = view.state.sliceDoc(node.from, node.to)
      const linkText = nodeText.match(/\[(.*?)\]/g)?.map(match => match.slice(1, -1))[0]
      view.dispatch({
        changes: {
          from: node.from,
          to: node.to,
          // insert: textToInsert
          insert: linkText
        }
      })
    }
  })
}
