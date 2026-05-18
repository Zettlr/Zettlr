/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Click Listeners
 * CVM-Role:        Plugin
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Defines a DomEventHandler for clicks on links. Can be
 *                  included in CodeMirror 6 states via
 *                  `EditorView.DomEventHandlers`.
 *
 * END HEADER
 */
import { syntaxTree } from '@codemirror/language'
import type { DOMEventHandlers } from '@codemirror/view'
import type { SyntaxNode } from '@lezer/common'
import openMarkdownLink from '../util/open-markdown-link'

export interface ClickListenerCallbacks {
  onWikiLink?: (url: string) => void
  onTag?: (tag: string) => void
}

/**
 * Defines DOM event listeners for clicks on potential links within CodeMirror
 * Markdown syntax trees. Offers optional callbacks for Wikilinks and Tags which
 * may require further handling.
 *
 * @param   {ClickListenerCallbacks<T>}  callbacks  The optional callbacks
 *
 * @return  {DOMEventHandlers<T>}                   The DOMEventHandlers.
 */
export function clickListeners<T = unknown> (callbacks?: ClickListenerCallbacks): DOMEventHandlers<T> {
  return {
    mousedown (event, view) {
      const cmd = event.metaKey && process.platform === 'darwin'
      const ctrl = event.ctrlKey && process.platform !== 'darwin'
      if (!cmd && !ctrl) {
        return false
      }

      const pos = view.posAtCoords({ x: event.clientX, y: event.clientY })
      if (pos === null) {
        return false
      }

      const nodeAt = syntaxTree(view.state).resolve(pos, 0)

      // Both plain URLs as well as Zettelkasten links and tags are
      // implemented on the syntax tree.
      if (nodeAt.type.name === 'URL') {
        // We found a plain link!
        const url = view.state.sliceDoc(nodeAt.from, nodeAt.to)
        if (url.startsWith('[[') && url.endsWith(']]')) {
          callbacks?.onWikiLink?.(url.substring(2, url.length - 2))
        } else {
          openMarkdownLink(url, view)
        }
        event.preventDefault()
        return true
      } else if ([ 'ZknLinkContent', 'ZknLinkTitle', 'ZknLinkPipe', 'ZknLinkMark' ].includes(nodeAt.type.name)) {
        // We found a Zettelkasten link!
        event.preventDefault()
        // In these cases, nodeAt.parent is always a ZettelkastenLink
        const contentNode = nodeAt.parent?.getChild('ZknLinkContent')
        if (contentNode != null) {
          const linkContents = view.state.sliceDoc(contentNode.from, contentNode.to)
          callbacks?.onWikiLink?.(linkContents)
        }
        return true
      } else if (nodeAt.type.name === 'ZknTag') {
        // A tag!
        const mark = nodeAt.getChild('ZknTagMark')
        const tagContents = view.state.sliceDoc(mark ? mark.to : nodeAt.from, nodeAt.to)
        callbacks?.onTag?.(tagContents)
        event.preventDefault()
        return true
      }

      // Lastly, the user may have clicked somewhere in a link. However,
      // since the link description can take various inline elements, we
      // have to recursively move up the tree until we find a 'Link' element
      // or abort if we reach the top
      let currentNode: SyntaxNode|null = nodeAt
      while (currentNode !== null && currentNode.name !== 'Link') {
        currentNode = currentNode.parent
      }

      if (currentNode !== null) {
        // We have a link
        const urlNode = currentNode.getChild('URL')
        if (urlNode !== null) {
          const url = view.state.sliceDoc(urlNode.from, urlNode.to)
          if (url.startsWith('[[') && url.endsWith(']]')) {
            callbacks?.onWikiLink?.(url.substring(2, url.length - 2))
          } else {
            openMarkdownLink(url, view)
          }
          event.preventDefault()
          return true
        }
      }
    }
  }
}
