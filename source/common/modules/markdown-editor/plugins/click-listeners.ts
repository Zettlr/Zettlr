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
import type { SyntaxNode, SyntaxNodeRef } from '@lezer/common'
import openMarkdownLink from '../util/open-markdown-link'
import { type EditorState } from '@codemirror/state'

export interface ClickListenerCallbacks {
  onWikiLink?: (url: string) => void
  onTag?: (tag: string) => void
}

/**
 * This function takes in a tree node, and returns true if that specific node is
 * a "keywords" or "tags" value that can be clicked by the user.
 *
 * @param   {SyntaxNodeRef}  node   The node
 * @param   {EditorState}    state  The editor state (to check values)
 *
 * @return  {boolean}               Whether it contains an actual frontmatter tag.
 */
function isFrontmatterKeywordOrTag (node: SyntaxNodeRef, state: EditorState): boolean {
  // YAML grammar structure (see https://code.haverbeke.berlin/lezer/yaml/src/branch/main/src/yaml.grammar)
  //
  // We want a "Pair" as a child of YAMLFrontmatter
  // That Pair needs to have a "Key" with the child "Literal" and value
  // "keywords" or "tags".
  // That pair will then also have a value, which can be:
  //
  // Literal -> Unquoted value, as is
  // QuotedLiteral -> Quoted value
  // BlockSequence -> list of Item/Literal nodes (long list)
  // FlowSequence -> list of Item/Literal nodes (one-line array-style list)

  if (node.type.name !== 'Literal' && node.type.name !== 'QuotedLiteral') {
    console.log('Node is neither Literal nor QuotedLiteral')
    return false
  }

  let parent = node.node.parent
  while (parent !== null) {
    if (parent.type.name === 'YAMLFrontmatter') {
      break
    }
    parent = parent.parent
  }

  if (parent?.type.name !== 'YAMLFrontmatter') {
    console.log('Node is not within a Frontmatter')
    return false
  }

  // It's definitely a YAML (quoted) literal somewhere in the frontmatter. It
  // must be furthermore a child of a FlowSequence or BlockSequence, or a Pair.
  // If it's part of a sequence, it additionally has a parent called "Item"
  const directParent = node.node.parent
  const valueContainer = directParent?.type.name === 'Item' ? directParent.parent : directParent
  if (valueContainer == null || ![ 'FlowSequence', 'BlockSequence', 'Pair' ].includes(valueContainer.type.name)) {
    console.log('Node is neither part of a FlowSequence nor BlockSequence, nor Pair')
    console.log(valueContainer?.type.name)
    return false
  }

  // It's a literal in a flow or block sequence, or direct part of a pair.
  const maybePair = valueContainer.type.name === 'Pair' ? valueContainer : valueContainer.parent
  if (maybePair?.type.name !== 'Pair') {
    console.log('Node is not part of a Pair')
    return false
  }

  // It's also part of a Pair, which must have a "Key" with either value
  // "keywords" or "tags".
  const key = maybePair.getChild('Key')
  if (key === null) {
    console.log('Nodes Pair did not have a key.')
    return false
  }

  const keyValue = state.sliceDoc(key.from, key.to)
  if (keyValue !== 'keywords' && keyValue !== 'tags') {
    console.log('Key value was neither keywords nor tags')
    return false
  }

  // Final check: This could be a nested property. By definition, tags/keywords
  // must be the top-level element. Thus, the parent chain of the Pair must be:
  // Pair -> BlockMapping -> Document
  // (The frontmatter is one large BlockMapping)
  if (maybePair.parent?.name !== 'BlockMapping' || maybePair.parent?.parent?.name !== 'Document') {
    console.log('Pair was not a top-level element.')
    return false
  }

  // Yup, it's a keyword.
  return true
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
      } else if (isFrontmatterKeywordOrTag(nodeAt, view.state)) {
        // "Literal" is a value type node that can occur in YAML text, or in
        // YAML frontmatters, and the function has verified that it is indeed
        // either a "keyword" or a "tag".
        let tagContents = view.state.sliceDoc(nodeAt.from, nodeAt.to)
        if (nodeAt.type.name === 'QuotedLiteral') {
          tagContents = tagContents.slice(1, tagContents.length - 1)
        }
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
