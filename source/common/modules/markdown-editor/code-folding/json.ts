/**
 * @ignore
 * BEGIN HEADER
 *
 * Contains:        JSON code folding service
 * CVM-Role:        View
 * Maintainer:      Hendrik Erz
 * License:         GNU GPL v3
 *
 * Description:     Folding service that can fold JSON files.
 *
 * END HEADER
 */

import { foldService, syntaxTree } from '@codemirror/language'

// Code folding for JSON documents
export const jsonFolding = foldService.of((state, lineStart, _lineEnd) => {
  const node = syntaxTree(state).cursorAt(lineStart, 1).node
  if (node.from < lineStart) {
    return null // The node doesn't start on this line
  } else if ([ 'Array', 'Object' ].includes(node.type.name)) {
    // In JSON, only Arrays and Objects can be folded
    return { from: node.from + 1, to: node.to - 1 }
  } else {
    // Nothing to fold
    return null
  }
})
