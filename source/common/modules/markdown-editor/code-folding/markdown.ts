/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        Markdown code folding service
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Folding service that can fold Markdown files.
 *
 * END HEADER
 */

import { foldService, syntaxTree } from '@codemirror/language'
import { type SyntaxNode } from '@lezer/common'

// Code folding for Markdown documents, as the regular code folding service
// doesn't completely do what we need it to. NOTE: Most folding is already
// provided by the corresponding mode. Here we only add more folding which that
// mode doesn't already provide out of the box.
export const markdownFolding = foldService.of((state, lineStart, _lineEnd) => {
  let { node } = syntaxTree(state).cursorAt(lineStart, 1)
  if (node.from < lineStart) {
    return null // The node doesn't start on this line
  } else if (
    node.type.name.startsWith('ATXHeading') ||
    node.type.name.startsWith('SetextHeading') ||
    node.type.name === 'HeaderMark'
  ) {
    if (node.type.name === 'HeaderMark' && node.parent !== null) {
      node = node.parent
    }

    // We need headings to be foldable. We basically just have to search for
    // the next heading of equal level (or below)
    const level = parseInt(node.type.name.slice(-1), 10)
    const allHeadings: SyntaxNode[] = []
    for (let i = level; i > -1; i--) {
      allHeadings.push(...syntaxTree(state).topNode.getChildren(`ATXHeading${i}`))
      if (i <= 2) {
        allHeadings.push(...syntaxTree(state).topNode.getChildren(`SetextHeading${i}`))
      }
    }

    // Sort (So that ATXHeadings and SetextHeadings are interleaved)
    allHeadings.sort((h1, h2) => {
      if (h1.from > h2.to) {
        return 1
      } else if (h2.from > h1.to) {
        return -1
      } else {
        return 0
      }
    })

    // Reduce to only headings after the one we're currently looking at
    const headingsAfter = allHeadings.filter(h => h.from > node.to)

    // Now the first heading in this list is the correct one
    if (headingsAfter.length === 0) {
      return { from: node.to, to: state.doc.length }
    } else {
      return { from: node.to, to: headingsAfter[0].from - 1 }
    }
  } else {
    // Nothing to fold
    return null
  }
})
