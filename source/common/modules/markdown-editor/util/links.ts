/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Link utilities
 * CVM-Role:        Utility Function
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     This module contains a set of utility functions for working
 *                  with links across a Markdown document. It includes counting
 *                  of referencing links, finding the counterpart to any Link or
 *                  LinkReference, and the appropriate removal of either.
 *
 * END HEADER
 */

import { syntaxTree } from '@codemirror/language'
import { type EditorState } from '@codemirror/state'
import { type SyntaxNode } from '@lezer/common'
import { type EditorView } from '@codemirror/view'
import { type ChangeSpec } from '@codemirror/state'

/**
 * Utility to remove a markdown link. It extracts the text from the markdown
 * link and replaces the link with just the text.
 *
 * @param  {EditorView}  view  The editor view
 * @param  {SyntaxNode}  node  The node containing the Link
 */
export function removeMarkdownLink (node: SyntaxNode, view: EditorView): void {
  const state = view.state
  const changes: ChangeSpec[] = []

  if (node.type.name === 'URL') {
    const linkText = state.sliceDoc(node.from, node.to)
    if (linkText.startsWith('<') && linkText.endsWith('>')) {
      // Remove the angle brackets
      changes.push({ from: node.from, to: node.to, insert: linkText.slice(1, linkText.length - 1) })
    } else {
      // LinkText is already a plain URL
    }
  } else if (node.type.name === 'Link') {
    // This is a regular in-text link. It may contain an URl, or just a link
    // label. In any case, we can already remove the link marks.
    const marks = node.getChildren('LinkMark')
    const linkText = state.sliceDoc(marks[0].to, marks[1].from)
    changes.push({ from: node.from, to: node.to, insert: linkText })

    const linkLabel = node.getChild('LinkLabel')
    if (linkLabel !== null) {
      // Off you go
      changes.push({ from: linkLabel.from, to: linkLabel.to, insert: '' })

      const labelString = state.sliceDoc(linkLabel.from, linkLabel.to)
      const ref = findReferenceForLinkLabel(state, labelString)
      if (ref !== null) {
        const count = countLinksReferencingLabel(state, labelString)
        if (count === 1) {
          // No other links referencing this label, so we can remove the reference.
          changes.push({ from: ref.from, to: ref.to, insert: '' })
        }
      }
    }
  } else if (node.type.name === 'LinkReference') {
    changes.push({ from: node.from, to: node.to, insert: '' })
    const linkLabel = node.getChild('LinkLabel')
    if (linkLabel !== null) {
      const labelString = state.sliceDoc(linkLabel.from, linkLabel.to)
      const links = findLinksforReferenceLinkLabel(state, labelString)

      // Remove all links referencing this.
      for (const link of links) {
        const marks = link.getChildren('LinkMark')
        const linkText = state.sliceDoc(marks[0].to, marks[1].from)
        changes.push({ from: link.from, to: link.to, insert: linkText })
      }
    }
  } else {
    console.error(`Cannot remove Markdown link for node -- wrong type: ${node.type.name}`)
  }

  view.dispatch({ changes })
}

/**
 * Takes an EditorState and a labelString, extracted from a LinkLabel node, and
 * returns all matching Link nodes (multiple links can reference the same
 * reference).
 *
 * @param   {EditorState}    state        The state
 * @param   {string}         labelString  The exact label string
 *
 * @return  {SyntaxNode[]}                A list of nodes.
 */
export function findLinksforReferenceLinkLabel (state: EditorState, labelString: string): SyntaxNode[] {
  const links: SyntaxNode[] = []
  syntaxTree(state).iterate({ 
    enter (node) {
      if (node.type.name !== 'Link') {
        return
      }

      const label = node.node.getChild('LinkLabel')
      if (label === null) {
        return
      }

      if (state.sliceDoc(label.from, label.to) === labelString) {
        links.push(node.node)
      }
    }
  })

  return links
}

/**
 * Takes an EditorState and a labelString, extracted from a LinkLabel node, and
 * returns a matching LinkReference node, which may (or may not!) contain an
 * URL.
 *
 * @param   {EditorState}  state        The state
 * @param   {string}       labelString  The exact label string
 *
 * @return  {SyntaxNode}                The LinkReference node, or null.
 */
export function findReferenceForLinkLabel (state: EditorState, labelString: string): SyntaxNode|null {
  let ref: SyntaxNode|null = null
  syntaxTree(state).iterate({
    enter (node) {
      if (ref !== null) {
        return false
      }

      if (node.type.name !== 'LinkReference') {
        return
      }

      const label = node.node.getChild('LinkLabel')
      if (label === null) {
        return
      }

      if (state.sliceDoc(label.from, label.to) === labelString) {
        ref = node.node
      }
    }
  })

  return ref
}

/**
 * Counts how many Links there are in the document that reference the same
 * LinkLabel. Useful to determine if one should actually remove a LinkReference,
 * or keep it because it is used by others.
 *
 * @param   {EditorState}  state        The state
 * @param   {string}       labelString  The exact label string
 *
 * @return  {number}                    The amount of Link-nodes referencing the
 *                                      label.
 */
export function countLinksReferencingLabel (state: EditorState, labelString: string): number {
  let count = 0

  syntaxTree(state).iterate({
    enter (node) {
      if (node.type.name !== 'Link') {
        return
      }

      const label = node.node.getChild('LinkLabel')
      if (label === null) {
        return
      }

      if (state.sliceDoc(label.from, label.to) === labelString) {
        count++
      }
    }
  })

  return count
}
